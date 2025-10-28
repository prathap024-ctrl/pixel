import { RateLimiter } from "@/lib/rateLimiter";
import { UIMessage } from "@/types/useChat";
import { v4 as uuidv4 } from "uuid";

export const CONFIG = {
  WORKER_POOL_SIZE: navigator.hardwareConcurrency || 2,
  UI_UPDATE_DEBOUNCE_MS: 16,
  MAX_MESSAGE_HISTORY: 1000,
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  WORKER_TIMEOUT_MS: 30000,
  MAX_RETRY_ATTEMPTS: 3,
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW_MS: 60000,
} as const;

export const globalStates = new Map<string, any>();
export const listenersByChat = new Map<string, Set<() => void>>();

export function getState(id: string) {
  if (!globalStates.has(id)) {
    globalStates.set(id, {
      messages: [],
      input: "",
      isLoading: false,
      error: undefined,
      usage: {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        reasoningTokens: 0,
        requests: 0,
        models: {}, // NEW: Track per model
      },
      rateLimiter: new RateLimiter(),
    });
  }
  return globalStates.get(id)!;
}

export function notify(id: string) {
  const listeners = listenersByChat.get(id);
  listeners?.forEach((l) => l());
}

export function createDebouncedNotify(id: string, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingUpdate = false;

  return {
    notify: () => {
      pendingUpdate = true;
      if (timeoutId === null) {
        timeoutId = setTimeout(() => {
          if (pendingUpdate) {
            notify(id);
            pendingUpdate = false;
          }
          timeoutId = null;
        }, delay);
      }
    },
    flush: () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (pendingUpdate) {
        notify(id);
        pendingUpdate = false;
      }
    },
    cleanup: () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      pendingUpdate = false;
    },
  };
}

export function generateId(): string {
  return `msg_${Date.now()}_${uuidv4().slice(0, 8)}`;
}

export function createMessage(
  role: "user" | "assistant" | "system",
  content?: string,
  metadata?: any
): UIMessage {
  return {
    id: generateId(),
    role,
    status: "idle",
    parts: content ? [{ type: "text", text: content, state: "done" }] : [],
    ...(metadata && { metadata }),
  };
}

export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

export function validateFile(file: File): void {
  if (!file || !(file instanceof File)) {
    throw new Error("Invalid file object");
  }

  if (file.size > CONFIG.MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB limit`
    );
  }

  if (file.size === 0) {
    throw new Error("File is empty");
  }

  const invalidChars = /[<>:"|?*\x00-\x1f]/g;
  if (invalidChars.test(file.name)) {
    throw new Error("File name contains invalid characters");
  }
}
