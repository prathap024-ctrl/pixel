import { ChatMessage } from "@/types/useChat";
import { getAiModel } from "./aiModels";

export const AVAILABLE_TOOLS = {
  web_search: {
    name: "web_search",
    description: "Search the web for information",
    parameters: {
      query: "string",
    },
  },
  calculate: {
    name: "calculate",
    description: "Perform mathematical calculations",
    parameters: {
      expression: "string",
    },
  },
  get_weather: {
    name: "get_weather",
    description: "Get current weather for a location",
    parameters: {
      location: "string",
    },
  },
};

export class AIService {
  private apiKey: string;
  private isOpenRouter: boolean;

  constructor() {
    const openrouter_apiKey = process.env.OPENROUTER_API_KEY;
    const openai_apiKey = process.env.OPENAI_API_KEY;
    const gemini_apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const perplexity_apiKey = process.env.PERPLEXITY_API_KEY;
    const claude_apiKey = process.env.CLAUDE_API_KEY;

    const apiKey =
      openrouter_apiKey ||
      openai_apiKey ||
      gemini_apiKey ||
      perplexity_apiKey ||
      claude_apiKey;

    if (!apiKey) {
      throw new Error("API_KEY is not set");
    }

    this.apiKey = apiKey;
    this.isOpenRouter = !!openrouter_apiKey;
  }

  async createChatCompletion(
    messages: ChatMessage[],
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
    } = {}
  ) {
    // Validate input messages first
    this.validateMessages(messages);

    const defaultModel = this.isOpenRouter ? "gpt-4o-mini" : "gpt-4o-mini";

    const finalOptions = {
      model: options.model || defaultModel,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      stream: options.stream,
    };

    try {
      const response = await getAiModel({
        apiKey: this.apiKey,
        messages: messages,
        options: finalOptions,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(
          `AI Service error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      return response;
    } catch (error) {
      console.error("Error in createChatCompletion:", error);
      throw error;
    }
  }

  // Validate messages before sending
  private validateMessages(messages: ChatMessage[]): void {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("Messages array cannot be empty");
    }

    messages.forEach((msg, index) => {
      if (!msg.role || typeof msg.role !== "string") {
        throw new Error(`Message at index ${index} is missing 'role' field`);
      }

      if (msg.content === undefined || msg.content === null) {
        throw new Error(`Message at index ${index} is missing 'content' field`);
      }

      // Ensure content is a string
      if (typeof msg.content !== "string") {
        console.warn(
          `Message at index ${index} has non-string content, converting to string`
        );
        msg.content = String(msg.content);
      }
    });
  }

  async *simulateThinking(prompt: string): AsyncGenerator<string> {
    const thinkingSteps = [
      "Analyzing the user's query...",
      "Breaking down the problem into components...",
      "Considering relevant context and information...",
      "Formulating a comprehensive response strategy...",
    ];

    for (const step of thinkingSteps) {
      yield JSON.stringify({
        type: "thinking",
        text: step,
        state: "streaming",
        title: "Planning Response",
      }) + "\n";
      await new Promise((r) => setTimeout(r, 300));
    }

    yield JSON.stringify({
      type: "finish",
      finishedTypes: ["thinking"],
    }) + "\n";
  }

  // Simulate tool calling
  async *simulateToolCall(toolName: string, args: any): AsyncGenerator<string> {
    const toolCallId = `call_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 11)}`;

    // Announce tool call
    yield JSON.stringify({
      type: "tool-call",
      toolCallId,
      toolName,
      args,
      state: "streaming",
    }) + "\n";

    await new Promise((r) => setTimeout(r, 500));

    // Update to executing
    yield JSON.stringify({
      type: "tool-call",
      toolCallId,
      toolName,
      args,
      state: "executing",
    }) + "\n";

    await new Promise((r) => setTimeout(r, 1000));

    // Simulate tool result
    let result;
    switch (toolName) {
      case "web_search":
        result = {
          results: [
            { title: "Example Result 1", url: "https://example.com/1" },
            { title: "Example Result 2", url: "https://example.com/2" },
          ],
        };
        break;
      case "calculate":
        result = { answer: "42", expression: args.expression };
        break;
      case "get_weather":
        result = {
          location: args.location,
          temperature: "72°F",
          condition: "Sunny",
        };
        break;
      default:
        result = { message: "Tool executed successfully" };
    }

    // Mark as complete
    yield JSON.stringify({
      type: "tool-call",
      toolCallId,
      toolName,
      args,
      state: "complete",
    }) + "\n";

    // Send result
    yield JSON.stringify({
      type: "tool-result",
      toolCallId,
      toolName,
      result,
    }) + "\n";
  }

  // Simulate workflow steps
  async *simulateWorkflow(): AsyncGenerator<string> {
    const steps = [
      {
        stepId: "step_1",
        title: "Initializing Request",
        description: "Preparing to process your query",
        status: "running",
        progress: 0,
      },
      {
        stepId: "step_2",
        title: "Analyzing Context",
        description: "Understanding the conversation context",
        status: "pending",
        progress: 0,
      },
      {
        stepId: "step_3",
        title: "Generating Response",
        description: "Creating a comprehensive answer",
        status: "pending",
        progress: 0,
      },
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Start step
      yield JSON.stringify({
        type: "workflow-step",
        ...step,
        status: "running",
      }) + "\n";

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 20) {
        yield JSON.stringify({
          type: "workflow-step",
          ...step,
          status: "running",
          progress,
        }) + "\n";
        await new Promise((r) => setTimeout(r, 200));
      }

      // Complete step
      yield JSON.stringify({
        type: "workflow-step",
        ...step,
        status: "completed",
        progress: 100,
      }) + "\n";

      await new Promise((r) => setTimeout(r, 300));
    }
  }

  async *handleStreamResponse(response: Response): AsyncGenerator<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            const data = line.slice(6);

            try {
              const parsed = JSON.parse(data);

              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                yield JSON.stringify({
                  type: "text",
                  text: content,
                  state: "streaming",
                }) + "\n";
              }
            } catch (e: any) {
              // Skip invalid JSON
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
