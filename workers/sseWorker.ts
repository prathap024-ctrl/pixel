import type { ChatFeatures } from "@/types/useChat";

interface ProcessBatchData {
  type: "process-batch";
  batch: string[];
  assistantId: string;
  features: ChatFeatures;
}

type WorkerTaskData = ProcessBatchData;

// Persistent streaming state per message
interface StreamingState {
  accumulatedText: string;
  lastUpdated: number;
  accumulatedReasoning?: string;
  accumulatedThinking?: string;
}

const streamingStates = new Map<string, StreamingState>();

const CONFIG = {
  MAX_TEXT_LENGTH: 1000000,
  MAX_BUFFER_AGE_MS: 30000,
  CLEANUP_INTERVAL_MS: 60000,
} as const;

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const toDelete: string[] = [];

    streamingStates.forEach((state, key) => {
      if (now - state.lastUpdated > CONFIG.MAX_BUFFER_AGE_MS) {
        toDelete.push(key);
      }
    });

    toDelete.forEach((key) => streamingStates.delete(key));
  }, CONFIG.CLEANUP_INTERVAL_MS);
}

function stopCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

function getStreamingState(assistantId: string): StreamingState {
  if (!streamingStates.has(assistantId)) {
    streamingStates.set(assistantId, {
      accumulatedText: "",
      lastUpdated: Date.now(),
      accumulatedReasoning: "",
      accumulatedThinking: "",
    });
  }
  const state = streamingStates.get(assistantId)!;
  state.lastUpdated = Date.now();
  return state;
}

function safeJsonParse(str: string): any {
  try {
    if (!str || typeof str !== "string") return null;
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function sanitizeText(text: string): string {
  if (typeof text !== "string") return "";
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

function validateText(
  text: string,
  maxLength: number = CONFIG.MAX_TEXT_LENGTH
): string {
  const sanitized = sanitizeText(text);

  if (sanitized.length > maxLength) {
    return sanitized.slice(0, maxLength) + "... [truncated]";
  }

  return sanitized;
}

// Process a single chunk - ONLY handle streaming text accumulation
function processChunk(
  data: string,
  assistantId: string,
  features: ChatFeatures,
  updates: any[]
) {
  const parsed = safeJsonParse(data);
  if (!parsed || typeof parsed !== "object") return;

  const state = getStreamingState(assistantId);

  // Handle ONLY text streaming - accumulate but send ONLY new chunk
  if (parsed.type === "text" && parsed.text) {
    const newText = validateText(parsed.text);

    // Accumulate internally
    state.accumulatedText = validateText(state.accumulatedText + newText);

    // Send ONLY new chunk
    updates.push({
      type: "text",
      data: {
        type: "text",
        text: newText, // Send ONLY new chunk
        state: "streaming",
      },
    });
    return;
  }

  if (parsed.type === "reasoning" && parsed.text && features.reasoning) {
    const newText = validateText(parsed.text);

    // Accumulate internally
    state.accumulatedReasoning = validateText(
      (state.accumulatedReasoning || "") + newText
    );

    // Send ONLY new chunk
    updates.push({
      type: "reasoning",
      data: {
        type: "reasoning",
        text: newText, // Send ONLY new chunk
        state: "streaming",
      },
    });
    return;
  }

  // Handle thinking streaming
  if (parsed.type === "thinking" && parsed.text && features.thinking) {
    const newText = validateText(parsed.text);

    // Accumulate internally
    state.accumulatedThinking = validateText(
      (state.accumulatedThinking || "") + newText
    );

    // Send ONLY new chunk
    updates.push({
      type: "thinking",
      data: {
        type: "thinking",
        text: newText, // Send ONLY new chunk
        state: "streaming",
      },
    });
    return;
  }

  // Handle finish - clean up
  if (parsed.type === "finish") {
    // Send final accumulated texts before cleanup
    if (state.accumulatedText) {
      updates.push({
        type: "text",
        data: {
          type: "text",
          text: state.accumulatedText,
          state: "done",
        },
      });
    }

    if (state.accumulatedReasoning) {
      updates.push({
        type: "reasoning",
        data: {
          type: "reasoning",
          text: state.accumulatedReasoning,
          state: "done",
        },
      });
    }

    if (state.accumulatedThinking) {
      updates.push({
        type: "thinking",
        data: {
          type: "thinking",
          text: state.accumulatedThinking,
          state: "done",
        },
      });
    }

    streamingStates.delete(assistantId);
    updates.push({
      type: "finish",
      data: {
        type: "finish",
      },
    });
    return;
  }

  // For non-streaming types, pass through unchanged
  updates.push({
    type: parsed.type,
    data: parsed,
  });
}

// Process a batch of chunks - streaming only
function processBatch(
  batch: string[],
  assistantId: string,
  features: ChatFeatures
): { updates: any[] } {
  const updates: any[] = [];

  if (!Array.isArray(batch) || batch.length === 0) {
    return { updates };
  }

  if (!assistantId || typeof assistantId !== "string") {
    throw new Error("Invalid assistantId");
  }

  // Process all chunks in batch
  for (const data of batch) {
    if (typeof data === "string" && data.length > 0) {
      processChunk(data, assistantId, features, updates);
    }
  }

  return { updates };
}

// Main message handler
self.addEventListener("message", async (e: MessageEvent<WorkerTaskData>) => {
  try {
    const data = e.data;

    if (!data || typeof data !== "object" || !data.type) {
      throw new Error("Invalid message data");
    }

    if (data.type === "process-batch") {
      const result = processBatch(data.batch, data.assistantId, data.features);
      self.postMessage(result);
    } else {
      throw new Error(`Unknown task type: ${data.type}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Worker] Error:", errorMessage);
    self.postMessage({
      error: sanitizeText(errorMessage),
    });
  }
});

startCleanup();

self.addEventListener("beforeunload", () => {
  stopCleanup();
  streamingStates.clear();
});

export { processBatch, sanitizeText, validateText };
