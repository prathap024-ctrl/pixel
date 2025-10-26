// workers/sseWorker.ts

/**
 * Production-ready SSE (Server-Sent Events) Worker
 * Handles streaming data parsing with proper buffering and error handling
 */

interface WorkerErrorMessage {
  type: "error";
  error: string;
}

interface WorkerDataMessage {
  type: "data";
  packets: string[];
}

export type WorkerMessage = WorkerDataMessage | WorkerErrorMessage;

// Buffer to handle incomplete chunks across network boundaries
let buffer = "";

/**
 * Parse SSE data from buffer
 * Handles both single-line and multi-line data events
 */
function parseSSEData(data: string): string[] {
  const packets: string[] = [];
  const lines = data.split("\n");
  let currentData: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();

    // SSE data line
    if (line.startsWith("data: ")) {
      const content = line.slice(6);

      // Skip [DONE] sentinel
      if (content === "[DONE]") {
        buffer = ""; // Clear buffer on stream end
        continue;
      }

      currentData.push(content);
    }
    // Empty line indicates end of event (for multi-line events)
    else if (line === "" && currentData.length > 0) {
      packets.push(currentData.join("\n"));
      currentData = [];
    }
    // SSE comments (ignore)
    else if (line.startsWith(":")) {
      continue;
    }
    // Other SSE fields (event:, id:, retry:) - ignore for now
    else if (line.includes(":")) {
      continue;
    }
  }

  // If we have accumulated data but no empty line yet, it's a single-line event
  if (currentData.length > 0) {
    packets.push(currentData.join("\n"));
  }

  return packets;
}

/**
 * Main message handler
 */
self.addEventListener("message", (e: MessageEvent<string>) => {
  try {
    // Append incoming data to buffer
    buffer += e.data;

    // Split by newlines to process complete lines
    const lines = buffer.split("\n");

    // Keep last line in buffer if chunk doesn't end with newline
    // (might be incomplete)
    if (!e.data.endsWith("\n")) {
      buffer = lines.pop() || "";
    } else {
      buffer = "";
    }

    // Rejoin lines for parsing
    const completeData = lines.join("\n");

    if (completeData.trim()) {
      const packets = parseSSEData(completeData + "\n");

      if (packets.length > 0) {
        const message: WorkerDataMessage = {
          type: "data",
          packets,
        };

        self.postMessage(message);
      }
    }
  } catch (error) {
    const errorMessage: WorkerErrorMessage = {
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    };

    self.postMessage(errorMessage);

    // Reset buffer on error to prevent cascading failures
    buffer = "";
  }
});

/**
 * Handle worker errors
 */
self.addEventListener("error", (e: ErrorEvent) => {
  const errorMessage: WorkerErrorMessage = {
    type: "error",
    error: e.message || "Unknown worker error",
  };

  self.postMessage(errorMessage);
  buffer = "";
});

/**
 * Cleanup on worker termination
 */
self.addEventListener("beforeunload", () => {
  buffer = "";
});