// hooks/useChat.ts
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type {
  UIMessage,
  TextUIPart,
  ReasoningUIPart,
  ThinkingUIPart,
  ToolCallUIPart,
  ToolResultUIPart,
  WorkflowStepUIPart,
  GlobalChatState,
  UseChatOptions,
  UseChatHelpers,
  WorkerMessage,
} from "@/types/useChat";
import { v4 as uuidv4 } from "uuid";

const globalStates = new Map<string, GlobalChatState>();
const listenersByChat = new Map<string, Set<() => void>>();

function getState(id: string): GlobalChatState {
  if (!globalStates.has(id)) {
    globalStates.set(id, {
      messages: [],
      input: "",
      isLoading: false,
      error: undefined,
    });
  }
  return globalStates.get(id)!;
}

function getListeners(id: string): Set<() => void> {
  if (!listenersByChat.has(id)) {
    listenersByChat.set(id, new Set());
  }
  return listenersByChat.get(id)!;
}

function notify(id: string) {
  const listeners = getListeners(id);
  listeners.forEach((l) => l());
}

/* ------------------  WORKER MANAGEMENT  ------------------ */

let workerInstance: Worker | null = null;
let workerInitialized = false;
let workerError: Error | null = null;

function initWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  if (workerInitialized) return workerInstance;

  try {
    workerInstance = new Worker(
      new URL("../workers/sseWorker.ts", import.meta.url),
      { type: "module" }
    );

    workerInstance.addEventListener("error", (e) => {
      console.error("[useChat] Worker error:", e);
      workerError = new Error(`Worker error: ${e.message}`);
    });

    workerInitialized = true;
    return workerInstance;
  } catch (err) {
    console.error("[useChat] Failed to initialize worker:", err);
    workerError = err instanceof Error ? err : new Error(String(err));
    return null;
  }
}

/* ------------------  UTILITIES  ------------------ */

export function generateId(): string {
  return `msg_${Date.now()}_${uuidv4()}`;
}

export function createMessage(
  role: "user" | "assistant" | "system",
  content?: string,
  data?: any
): UIMessage {
  const parts: UIMessage["parts"] = [];
  if (content) {
    parts.push({
      type: "text",
      text: content,
      state: "done",
    } as TextUIPart);
  }
  return {
    id: generateId(),
    role,
    parts,
    ...(data && { metadata: data }),
  };
}

function safeJsonParse(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/* ------------------  HOOK  ------------------ */

export function useChat<M = unknown, D = {}, T = {}>(
  opts: UseChatOptions<M, D, T> = {}
): UseChatHelpers<M, D, T> {
  const {
    id = "chat",
    initialMessages = [],
    model,
    initialInput = "",
    api = "/api/chat",
    credentials = "same-origin",
    headers = {},
    body = {},
    onResponse,
    onFinish,
    onError,
    onToolCall,
    onWorkflowStep,
    sendExtraMessageFields = false,
    experimental_throttle = 0,
    persist = false,
    storageKey = `chat-store-${id}`,
    keepLastMessageOnError = true,
    maxRetries = 0,
    retryDelay = 1000,
  } = opts;

  const state = getState(id);
  const abortRef = useRef<AbortController | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Track accumulated text per message per type for streaming
  const streamBufferRef = useRef<
    Map<
      string,
      {
        text?: string;
        reasoning?: string;
        thinking?: string;
      }
    >
  >(new Map());

  /* ----------  INITIALIZATION  ---------- */

  useEffect(() => {
    if (initialMessages.length > 0 && state.messages.length === 0) {
      state.messages = initialMessages;
      notify(id);
    }
    if (initialInput && !state.input) {
      state.input = initialInput;
      notify(id);
    }
  }, []);

  useEffect(() => {
    workerRef.current = initWorker();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  /* ----------  PERSISTENCE  ---------- */
  useEffect(() => {
    if (persist && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const { messages, input } = JSON.parse(raw);
          state.messages = messages || [];
          state.input = input || "";
          notify(id);
        }
      } catch (err) {
        console.error("[useChat] Failed to load from localStorage:", err);
      }

      const save = () => {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              messages: state.messages,
              input: state.input,
            })
          );
        } catch (err) {
          console.error("[useChat] Failed to save to localStorage:", err);
        }
      };

      const listeners = getListeners(id);
      listeners.add(save);

      // ✅ Cleanup function must return void
      return () => {
        listeners.delete(save); // do not return anything
      };
    }

    // no cleanup needed if persist is false
  }, [persist, storageKey, id]);

  /* ----------  LOCAL STATE SYNC  ---------- */

  const [, forceRender] = useState({});

  useEffect(() => {
    const cb = () => forceRender({});
    const listeners = getListeners(id);
    listeners.add(cb);
    return () => {
      listeners.delete(cb); // do not return anything
    };
  }, [id]);

  /* ----------  STATE SETTERS  ---------- */

  const setInput = useCallback(
    (v: string) => {
      state.input = v;
      notify(id);
    },
    [id]
  );

  const setMessages = useCallback(
    (m: UIMessage[]) => {
      state.messages = m;
      notify(id);
    },
    [id]
  );

  const setIsLoading = useCallback(
    (b: boolean) => {
      state.isLoading = b;
      notify(id);
    },
    [id]
  );

  const setError = useCallback(
    (e?: Error) => {
      state.error = e;
      notify(id);
    },
    [id]
  );

  const addMessage = useCallback(
    (m: UIMessage) => {
      state.messages = [...state.messages, m];
      notify(id);
    },
    [id]
  );

  const updateMessage = useCallback(
    (messageId: string, fn: (m: UIMessage) => UIMessage) => {
      state.messages = state.messages.map((m) =>
        m.id === messageId ? fn(m) : m
      );
      notify(id);
    },
    [id]
  );

  const removeMessage = useCallback(
    (messageId: string) => {
      state.messages = state.messages.filter((m) => m.id !== messageId);
      notify(id);
    },
    [id]
  );

  const clear = useCallback(() => {
    state.messages = [];
    state.input = "";
    state.isLoading = false;
    state.error = undefined;
    streamBufferRef.current.clear();
    notify(id);
  }, [id]);

  /* ----------  TOOL HANDLERS  ---------- */

  const addToolResult = useCallback(
    (toolCallId: string, result: any) => {
      const msgWithTool = state.messages.find((m) =>
        m.parts.some(
          (p: any) => p.type === "tool-call" && p.toolCallId === toolCallId
        )
      );

      if (msgWithTool) {
        updateMessage(msgWithTool.id, (msg) => ({
          ...msg,
          parts: [
            ...msg.parts,
            {
              type: "tool-result",
              toolCallId,
              toolName:
                (msg.parts.find((p: any) => p.toolCallId === toolCallId) as any)
                  ?.toolName || "unknown",
              result,
              state: "done",
            } as ToolResultUIPart,
          ],
        }));
      }
    },
    [updateMessage]
  );

  const addToolError = useCallback(
    (toolCallId: string, error: string) => {
      const msgWithTool = state.messages.find((m) =>
        m.parts.some(
          (p: any) => p.type === "tool-call" && p.toolCallId === toolCallId
        )
      );

      if (msgWithTool) {
        updateMessage(msgWithTool.id, (msg) => ({
          ...msg,
          parts: [
            ...msg.parts,
            {
              type: "tool-result",
              toolCallId,
              toolName:
                (msg.parts.find((p: any) => p.toolCallId === toolCallId) as any)
                  ?.toolName || "unknown",
              result: null,
              error,
              state: "done",
            } as ToolResultUIPart,
          ],
        }));
      }
    },
    [updateMessage]
  );

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
  }, [setIsLoading]);

  /* ----------  STREAMING: PROCESS CHUNKS  ---------- */

  const processChunk = useCallback(
    (data: string, assistantId: string) => {
      const parsed = safeJsonParse(data);
      if (!parsed) return;

      // Handle text streaming
      if (parsed.type === "text") {
        const buffer = streamBufferRef.current.get(assistantId) || {};
        buffer.text = (buffer.text || "") + (parsed.text || "");
        streamBufferRef.current.set(assistantId, buffer);

        updateMessage(assistantId, (msg) => {
          const idx = msg.parts.findIndex(
            (p) => p.type === "text" && (p as any).state === "streaming"
          );

          const part: TextUIPart = {
            type: "text",
            text: buffer.text!,
            state: "streaming",
          };

          return {
            ...msg,
            parts:
              idx >= 0
                ? msg.parts.map((p, i) => (i === idx ? part : p))
                : [...msg.parts, part],
          };
        });
      }

      // Handle reasoning streaming
      if (parsed.type === "reasoning") {
        const buffer = streamBufferRef.current.get(assistantId) || {};
        buffer.reasoning = (buffer.reasoning || "") + (parsed.text || "");
        streamBufferRef.current.set(assistantId, buffer);

        updateMessage(assistantId, (msg) => {
          const idx = msg.parts.findIndex(
            (p) => p.type === "reasoning" && (p as any).state === "streaming"
          );

          const part: ReasoningUIPart = {
            type: "reasoning",
            text: buffer.reasoning!,
            state: "streaming",
          };

          return {
            ...msg,
            parts:
              idx >= 0
                ? msg.parts.map((p, i) => (i === idx ? part : p))
                : [...msg.parts, part],
          };
        });
      }

      // Handle thinking/chain-of-thought streaming
      if (parsed.type === "thinking") {
        const buffer = streamBufferRef.current.get(assistantId) || {};
        buffer.thinking = (buffer.thinking || "") + (parsed.text || "");
        streamBufferRef.current.set(assistantId, buffer);

        updateMessage(assistantId, (msg) => {
          const idx = msg.parts.findIndex(
            (p) => p.type === "thinking" && (p as any).state === "streaming"
          );

          const part: ThinkingUIPart = {
            type: "thinking",
            text: buffer.thinking!,
            state: "streaming",
            title: parsed.title,
          };

          return {
            ...msg,
            parts:
              idx >= 0
                ? msg.parts.map((p, i) => (i === idx ? part : p))
                : [...msg.parts, part],
          };
        });
      }

      // Handle tool calls
      if (parsed.type === "tool-call") {
        updateMessage(assistantId, (msg) => {
          const existingIdx = msg.parts.findIndex(
            (p: any) =>
              p.type === "tool-call" && p.toolCallId === parsed.toolCallId
          );

          const toolPart: ToolCallUIPart = {
            type: "tool-call",
            toolCallId: parsed.toolCallId,
            toolName: parsed.toolName,
            args: parsed.args,
            state: parsed.state || "streaming",
          };

          // Trigger callback
          onToolCall?.(toolPart);

          return {
            ...msg,
            parts:
              existingIdx >= 0
                ? msg.parts.map((p, i) => (i === existingIdx ? toolPart : p))
                : [...msg.parts, toolPart],
          };
        });
      }

      // Handle tool results
      if (parsed.type === "tool-result") {
        updateMessage(assistantId, (msg) => ({
          ...msg,
          parts: [
            ...msg.parts,
            {
              type: "tool-result",
              toolCallId: parsed.toolCallId,
              toolName: parsed.toolName,
              result: parsed.result,
              error: parsed.error,
              state: "done",
            } as ToolResultUIPart,
          ],
        }));
      }

      // Handle workflow steps
      if (parsed.type === "workflow-step") {
        updateMessage(assistantId, (msg) => {
          const existingIdx = msg.parts.findIndex(
            (p: any) => p.type === "workflow-step" && p.stepId === parsed.stepId
          );

          const stepPart: WorkflowStepUIPart = {
            type: "workflow-step",
            stepId: parsed.stepId,
            title: parsed.title,
            description: parsed.description,
            status: parsed.status,
            progress: parsed.progress,
            metadata: parsed.metadata,
          };

          // Trigger callback
          onWorkflowStep?.(stepPart);

          return {
            ...msg,
            parts:
              existingIdx >= 0
                ? msg.parts.map((p, i) => (i === existingIdx ? stepPart : p))
                : [...msg.parts, stepPart],
          };
        });
      }

      // Handle finish
      if (parsed.type === "finish") {
        const finished = new Set(parsed.finishedTypes ?? []);
        updateMessage(assistantId, (msg) => ({
          ...msg,
          parts: msg.parts.map((p: any) => {
            if (
              (p.type === "text" ||
                p.type === "reasoning" ||
                p.type === "thinking") &&
              p.state === "streaming" &&
              finished.has(p.type)
            ) {
              return { ...p, state: "done" };
            }
            if (
              p.type === "tool-call" &&
              p.state === "streaming" &&
              finished.has("tool-call")
            ) {
              return { ...p, state: "complete" };
            }
            return p;
          }),
        }));

        streamBufferRef.current.delete(assistantId);
      }

      // Handle errors
      if (parsed.type === "error") {
        setError(new Error(parsed.error || "Stream error"));
        streamBufferRef.current.delete(assistantId);
      }
    },
    [updateMessage, setError, onToolCall, onWorkflowStep]
  );

  /* ----------  STREAMING: FETCH WITH RETRY  ---------- */

  const fetchWithRetry = useCallback(
    async (
      url: string,
      options: RequestInit,
      retries = 0
    ): Promise<Response> => {
      try {
        const res = await fetch(url, options);

        if (!res.ok && res.status >= 400 && res.status < 500) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        if (!res.ok && retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          return fetchWithRetry(url, options, retries + 1);
        }

        return res;
      } catch (err) {
        if (
          retries < maxRetries &&
          err instanceof Error &&
          err.name !== "AbortError"
        ) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          return fetchWithRetry(url, options, retries + 1);
        }
        throw err;
      }
    },
    [maxRetries, retryDelay]
  );

  /* ----------  MAIN APPEND FUNCTION  ---------- */

  const append = useCallback(
    async (
      msg: UIMessage | { role: "user"; content: string; data?: any },
      opts: any = {}
    ) => {
      if (state.isLoading) {
        console.warn("[useChat] Request already in progress");
        return;
      }

      setIsLoading(true);
      setError(undefined);

      const userMsg =
        "content" in msg ? createMessage("user", msg.content, msg.data) : msg;
      addMessage(userMsg);

      const assistantMsg = createMessage("assistant");
      addMessage(assistantMsg);

      // Initialize buffer for this message
      streamBufferRef.current.set(assistantMsg.id, {});

      abortRef.current = new AbortController();

      try {
        const allMsgs = [...state.messages, userMsg].filter(
          (m) => m.id !== assistantMsg.id
        );

        const reqBody = {
          model: model,
          messages: sendExtraMessageFields
            ? allMsgs
            : allMsgs.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.parts
                  .filter((p) => p.type === "text")
                  .map((p: any) => p.text)
                  .join(""),
              })),
          ...body,
          ...opts.body,
        };

        const headersObj = typeof headers === "function" ? headers() : headers;

        const res = await fetchWithRetry(api, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headersObj,
            ...opts.headers,
          },
          body: JSON.stringify(reqBody),
          credentials,
          signal: abortRef.current.signal,
        });

        await onResponse?.(res);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        if (!res.body) {
          throw new Error("Response body is null");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });

          if (workerRef.current && !workerError) {
            const packets: string[] = await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error("Worker timeout"));
              }, 5000);

              const handleMessage = (e: MessageEvent<WorkerMessage>) => {
                clearTimeout(timeout);
                workerRef.current?.removeEventListener(
                  "message",
                  handleMessage
                );

                if (e.data.type === "error") {
                  reject(new Error(e.data.error));
                } else {
                  resolve(e.data.packets);
                }
              };

              workerRef.current?.addEventListener("message", handleMessage);
              workerRef.current?.postMessage(text);
            });

            for (const packet of packets) {
              processChunk(packet, assistantMsg.id);
            }
          } else {
            const lines = text.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                processChunk(trimmed.slice(6), assistantMsg.id);
              }
            }
          }

          if (experimental_throttle) {
            await new Promise((r) => setTimeout(r, experimental_throttle));
          }
        }

        updateMessage(assistantMsg.id, (m) => {
          const finalized = {
            ...m,
            parts: m.parts.map((p: any) =>
              (p.type === "text" ||
                p.type === "reasoning" ||
                p.type === "thinking") &&
              p.state === "streaming"
                ? { ...p, state: "done" }
                : p
            ),
          };
          onFinish?.(finalized as UIMessage<M, D, T>);
          return finalized;
        });

        streamBufferRef.current.delete(assistantMsg.id);
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.log("[useChat] Request aborted");
          return;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        console.error("[useChat] Error:", error);

        setError(error);
        onError?.(error);

        if (!keepLastMessageOnError) {
          removeMessage(assistantMsg.id);
        }

        streamBufferRef.current.delete(assistantMsg.id);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [
      id,
      model,
      api,
      body,
      credentials,
      experimental_throttle,
      headers,
      keepLastMessageOnError,
      onError,
      onFinish,
      onResponse,
      sendExtraMessageFields,
      processChunk,
      setIsLoading,
      setError,
      addMessage,
      updateMessage,
      removeMessage,
      fetchWithRetry,
    ]
  );

  /* ----------  CONVENIENCE METHODS  ---------- */

  const reload = useCallback(async () => {
    const msgs = state.messages;
    const lastUserIdx = msgs.findLastIndex((m) => m.role === "user");

    if (lastUserIdx === -1) {
      console.warn("[useChat] No user message to reload");
      return;
    }

    setMessages(msgs.slice(0, lastUserIdx));
    await append(msgs[lastUserIdx]);
  }, [append, setMessages]);

  const regenerate = useCallback(async () => {
    const msgs = state.messages;
    const lastAssistantIdx = msgs.findLastIndex((m) => m.role === "assistant");

    if (lastAssistantIdx === -1) {
      console.warn("[useChat] No assistant message to regenerate");
      return;
    }

    // Find the user message that triggered this assistant response
    const userMsgIdx = msgs
      .slice(0, lastAssistantIdx)
      .findLastIndex((m) => m.role === "user");

    if (userMsgIdx === -1) {
      console.warn("[useChat] No user message found before assistant message");
      return;
    }

    // Remove the assistant message and everything after it
    setMessages(msgs.slice(0, lastAssistantIdx));

    // Remove the user message that triggered this response
    setMessages(msgs.slice(0, userMsgIdx));

    // Resend the user message to get a new response
    await append(msgs[userMsgIdx]);
  }, [append, setMessages]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent | KeyboardEvent, opts?: any) => {
      e?.preventDefault();

      const trimmedInput = state.input.trim();
      if (!trimmedInput || state.isLoading) return;

      const submitOpts = {
        ...opts,
        body: {
          ...body,
          id: id,
          model: model,
        },
      };

      append({ role: "user", content: trimmedInput, data: body }, submitOpts);
      setInput("");
    },
    [append, body, setInput, model, id]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [setInput]
  );

  /* ----------  PUBLIC API  ---------- */

  return useMemo(
    () => ({
      messages: state.messages as UIMessage<M, D, T>[],
      error: state.error,
      isLoading: state.isLoading,
      input: state.input,
      append,
      stop,
      reload,
      setInput,
      handleSubmit,
      handleInputChange,
      regenerate,
      setMessages: setMessages as any,
      addToolResult,
      addToolError,
      clear,
      removeMessage,
      updateMessage: updateMessage as any,
    }),
    [
      state.messages,
      state.error,
      state.isLoading,
      state.input,
      append,
      stop,
      reload,
      setInput,
      handleSubmit,
      regenerate,
      handleInputChange,
      setMessages,
      addToolResult,
      addToolError,
      clear,
      removeMessage,
      updateMessage,
    ]
  );
}
