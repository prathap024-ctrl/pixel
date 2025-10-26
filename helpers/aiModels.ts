import { ChatMessage } from "@/types/useChat";

// Validate and sanitize messages
function validateAndSanitizeMessages(
  messages: ChatMessage[]
): { role: string; content: string }[] {
  return messages
    .filter((msg) => {
      // Check that role exists and is a non-empty string
      const hasValidRole =
        msg.role && typeof msg.role === "string" && msg.role.trim().length > 0;

      // Check that content exists (can be empty string, but not null/undefined)
      const hasContent = msg.content !== undefined && msg.content !== null;

      const isValid = hasValidRole && hasContent;

      if (!isValid) {
        console.warn("Invalid message filtered out:", {
          role: msg.role,
          hasValidRole,
          hasContent,
          contentType: typeof msg.content,
        });
      }

      return isValid;
    })
    .map((msg) => ({
      role: msg.role.trim(),
      content: String(msg.content), // Convert to string, preserving empty strings
    }));
}

export function getAiModel({
  messages,
  options = {},
  apiKey,
}: {
  messages: ChatMessage[];
  options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  };
  apiKey: string;
}): Promise<Response> {
  const model = options?.model || "openai/gpt-4o-mini";

  if (!model) {
    throw new Error("Model is required");
  }

  // Validate and sanitize messages before sending
  const sanitizedMessages = validateAndSanitizeMessages(messages);

  if (sanitizedMessages.length === 0) {
    throw new Error(
      "No valid messages provided. Each message must have both 'role' and 'content'."
    );
  }

  const config = {
    baseUrl: "https://openrouter.ai/api/v1",
    endpoint: "/chat/completions",
    defaultTemperature: 0.7,
    defaultMaxTokens: 2056,
    headers: {
      "HTTP-Referer": "https://localhost:3000",
      "X-Title": "PixelPilot",
    },
  };

  const payload = {
    model: model,
    messages: sanitizedMessages,
    temperature: options.temperature ?? config.defaultTemperature,
    max_tokens: options.max_tokens ?? config.defaultMaxTokens,
    stream: options.stream ?? false,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...config.headers,
  };

  return fetch(`${config.baseUrl}${config.endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}
