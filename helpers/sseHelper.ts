import { ChatMessage } from "@/types/useChat";

export function validateAndSanitizeMessages(
  messages: ChatMessage[]
): { role: string; content: string }[] {
  return messages
    .filter((msg) => {
      const hasValidRole =
        msg.role && typeof msg.role === "string" && msg.role.trim().length > 0;
      const hasContent = msg.content !== undefined && msg.content !== null;

      if (!hasValidRole || !hasContent) {
        console.warn("Invalid message filtered:", {
          role: msg.role,
          hasContent,
        });
      }

      return hasValidRole && hasContent;
    })
    .map((msg) => ({
      role: msg.role.trim(),
      content: String(msg.content),
    }));
}

// Optimized AI service with proper streaming
export class AIService {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor() {
    const apiKey =
      process.env.OPENROUTER_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.PERPLEXITY_API_KEY ||
      process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      throw new Error("No API key configured");
    }

    this.apiKey = apiKey;
  }

  async createChatCompletion(
    messages: Array<{ role: string; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<Response> {
    const payload = {
      model: options.model || "openai/gpt-4o-mini",
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 8000,
      stream: options.stream ?? false,
    };

    const config = {
      baseUrl: "https://openrouter.ai/api/v1",
      endpoint: "/chat/completions",
      headers: {
        "HTTP-Referer": "https://localhost:3000",
        "X-Title": "PixelPilot",
      },
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...config.headers,
    };

    return fetch(`${config.baseUrl}${config.endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  }

  async *streamThinking(prompt: string): AsyncGenerator<string> {
    const steps = [
      "Analyzing query",
      "Processing context",
      "Formulating response",
    ];

    for (const step of steps) {
      yield JSON.stringify({
        type: "thinking",
        text: step + "\n",
        state: "streaming",
        title: "Thinking",
      });
      await new Promise((r) => setTimeout(r, 100));
    }

    yield JSON.stringify({
      type: "finish",
      finishedTypes: ["thinking"],
    });
  }

  async *streamReasoning(prompt: string): AsyncGenerator<string> {
    const steps = [
      "Analyzing query",
      "Processing context",
      "Formulating response",
    ];

    for (const step in steps) {
      yield JSON.stringify({
        type: "reasoning",
        text: "Analyzing: " + step + "\n",
        state: "streaming",
      });
      await new Promise((r) => setTimeout(r, 150));
    }
    yield JSON.stringify({
      type: "finish",
      finishedTypes: ["reasoning"],
    });
  }

  async *streamToolCall(toolName: string, args: any): AsyncGenerator<string> {
    const toolCallId = `call_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 11)}`;

    yield JSON.stringify({
      type: "tool-call",
      toolCallId,
      toolName,
      args,
      state: "streaming",
    });

    await new Promise((r) => setTimeout(r, 200));

    yield JSON.stringify({
      type: "tool-call",
      toolCallId,
      toolName,
      args,
      state: "executing",
    });

    await new Promise((r) => setTimeout(r, 300));

    let result: any;
    switch (toolName) {
      case "web_search":
        result = {
          results: [
            {
              title: "Result 1",
              url: "https://example.com/1",
              snippet: "Info...",
            },
            {
              title: "Result 2",
              url: "https://example.com/2",
              snippet: "More info...",
            },
          ],
        };
        break;
      case "calculate":
        try {
          result = {
            answer: eval(args.expression),
            expression: args.expression,
          };
        } catch {
          result = { error: "Invalid expression" };
        }
        break;
      case "get_weather":
        result = {
          location: args.location,
          temperature: "72°F",
          condition: "Sunny",
        };
        break;
      default:
        result = { message: "Tool executed" };
    }

    yield JSON.stringify({
      type: "tool-call",
      toolCallId,
      toolName,
      args,
      state: "complete",
    });

    yield JSON.stringify({
      type: "tool-result",
      toolCallId,
      toolName,
      result,
    });
  }

  async *streamWorkflow(): AsyncGenerator<string> {
    const steps = [
      { id: "1", title: "Initializing" },
      { id: "2", title: "Processing" },
      { id: "3", title: "Generating" },
    ];

    for (const step of steps) {
      const stepId = `step_${step.id}`;

      yield JSON.stringify({
        type: "workflow-step",
        stepId,
        title: step.title,
        status: "running",
        progress: 0,
      });

      for (let progress = 25; progress <= 100; progress += 25) {
        yield JSON.stringify({
          type: "workflow-step",
          stepId,
          title: step.title,
          status: "running",
          progress,
        });
        await new Promise((r) => setTimeout(r, 100));
      }

      yield JSON.stringify({
        type: "workflow-step",
        stepId,
        title: step.title,
        status: "completed",
        progress: 100,
      });
    }
  }

  detectToolRequests(content: string): Array<{ name: string; args: any }> {
    const tools: Array<{ name: string; args: any }> = [];
    const lower = content.toLowerCase();

    if (lower.includes("search")) {
      tools.push({ name: "web_search", args: { query: content } });
    }
    if (lower.match(/calculate|compute|math/i)) {
      tools.push({ name: "calculate", args: { expression: "2 + 2" } });
    }
    if (lower.includes("weather")) {
      tools.push({ name: "get_weather", args: { location: "San Francisco" } });
    }

    return tools;
  }

  async *handleStreamResponse(response: Response): AsyncGenerator<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();

          // Skip empty lines and stream end markers
          if (!trimmed || trimmed === "data: [DONE]") continue;

          // Only process data lines
          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6);

            try {
              const parsed = JSON.parse(data);

              // Extract text content - send ONLY the chunk, not accumulated
              if (parsed.choices?.[0]?.delta?.content) {
                const chunk = parsed.choices[0].delta.content;

                // IMPORTANT: Send only this chunk, NOT accumulated
                yield JSON.stringify({
                  type: "text",
                  text: chunk,
                  state: "streaming",
                });
              }

              // Handle usage stats
              if (parsed.usage) {
                yield JSON.stringify({
                  type: "usage",
                  data: {
                    totalTokens: parsed.usage.total_tokens || 0,
                    promptTokens: parsed.usage.prompt_tokens || 0,
                    completionTokens: parsed.usage.completion_tokens || 0,
                  },
                });
              }
            } catch (e) {
              // Silently skip malformed JSON
              continue;
            }
          }
        }
      }

      // Final flush of any remaining buffer
      if (buffer.trim() && buffer.trim() !== "data: [DONE]") {
        if (buffer.trim().startsWith("data: ")) {
          const data = buffer.trim().slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices?.[0]?.delta?.content) {
              const chunk = parsed.choices[0].delta.content;

              yield JSON.stringify({
                type: "text",
                text: chunk,
                state: "streaming",
              });
            }
          } catch {
            // Ignore
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
