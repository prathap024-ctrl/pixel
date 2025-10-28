import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type {
  UIMessage,
  UseChatOptions,
  UseChatHelpers,
  ChatFeatures,
  UsageStats,
} from "@/types/useChat";
import {
  CONFIG,
  createDebouncedNotify,
  createMessage,
  getState,
  listenersByChat,
  notify,
  sanitizeInput,
  validateFile,
} from "@/helpers/useChatHelper";
import { getWorkerPool, workerPool } from "@/workers/workerManagement";

export function useChat<
  M = unknown,
  D extends Record<string, any> = Record<string, any>
>(opts: UseChatOptions<M, D> = {}): UseChatHelpers<M, D> {
  const {
    id = "chat",
    initialMessages = [],
    model,
    initialInput = "",
    api = "/api/chat",
    credentials = "same-origin",
    headers = {},
    body = {},
    features = {},
    onResponse,
    onFinish,
    onError,
    onToolCall,
    onWorkflowStep,
    persist = false,
    storageKey = `chat-${id}`,
    keepLastMessageOnError = true,
    maxRetries = 0,
    retryDelay = 1000,
  } = opts;

  const state = getState(id);
  const abortRef = useRef<AbortController | null>(null);
  const debouncedNotifyRef = useRef<ReturnType<
    typeof createDebouncedNotify
  > | null>(null);
  const chunkBatchRef = useRef<string[]>([]);
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const isStreamingRef = useRef<Set<string>>(new Set());
  const textAccumRef = useRef<Record<string, string>>({});
  const reasoningAccumRef = useRef<Record<string, string>>({});

  const enabledFeatures: ChatFeatures = useMemo(
    () => ({
      reasoning: features.reasoning ?? false,
      thinking: features.thinking ?? false,
      toolCalling: features.toolCalling ?? false,
      workflow: features.workflow ?? false,
      fileHandling: features.fileHandling ?? false,
    }),
    [features]
  );

  useEffect(() => {
    isMountedRef.current = true;
    debouncedNotifyRef.current = createDebouncedNotify(
      id,
      CONFIG.UI_UPDATE_DEBOUNCE_MS
    );

    if (initialMessages.length > 0 && state.messages.length === 0) {
      state.messages = initialMessages.slice(0, CONFIG.MAX_MESSAGE_HISTORY);
      notify(id);
    }
    if (initialInput && !state.input) {
      state.input = sanitizeInput(initialInput);
      notify(id);
    }

    return () => {
      isMountedRef.current = false;
      debouncedNotifyRef.current?.cleanup();
      debouncedNotifyRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!persist || typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          state.messages = (parsed.messages || []).slice(
            0,
            CONFIG.MAX_MESSAGE_HISTORY
          );
          state.input = sanitizeInput(parsed.input || "");
          notify(id);
        }
      }
    } catch (err) {
      console.error("Failed to load from localStorage:", err);
    }

    const save = () => {
      try {
        const data = {
          messages: state.messages.slice(-CONFIG.MAX_MESSAGE_HISTORY),
          input: state.input,
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (err) {
        console.error("Failed to save to localStorage:", err);
      }
    };

    const listeners = listenersByChat.get(id) || new Set();
    listeners.add(save);
    listenersByChat.set(id, listeners);

    return () => {
      listeners.delete(save);
    };
  }, [persist, storageKey, id]);

  const [, forceRender] = useState({});

  useEffect(() => {
    const cb = () => {
      if (isMountedRef.current) {
        forceRender({});
      }
    };
    const listeners = listenersByChat.get(id) || new Set();
    listeners.add(cb);
    listenersByChat.set(id, listeners);

    return () => {
      listeners.delete(cb);
    };
  }, [id]);

  const setInput = useCallback(
    (v: string) => {
      state.input = sanitizeInput(v);
      notify(id);
    },
    [id]
  );

  const setMessages = useCallback(
    (m: UIMessage[]) => {
      state.messages = m.slice(0, CONFIG.MAX_MESSAGE_HISTORY);
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

  const updateMessage = useCallback(
    (messageId: string, fn: (m: UIMessage) => UIMessage) => {
      state.messages = state.messages.map((m: UIMessage) =>
        m.id === messageId ? fn(m) : m
      );

      if (debouncedNotifyRef.current && state.isLoading) {
        debouncedNotifyRef.current.notify();
      } else {
        notify(id);
      }
    },
    [id]
  );

  const updateUsage = useCallback(
    (usageData: {
      promptTokens: number;
      completionTokens: number;
      reasoningTokens?: number;
      totalTokens: number;
      model?: string;
    }) => {
      const {
        promptTokens = 0,
        completionTokens = 0,
        reasoningTokens = 0,
        totalTokens = 0,
        model,
      } = usageData;

      // Update global usage
      state.usage = {
        totalTokens: (state.usage.totalTokens || 0) + totalTokens,
        promptTokens: (state.usage.promptTokens || 0) + promptTokens,
        completionTokens:
          (state.usage.completionTokens || 0) + completionTokens,
        reasoningTokens: (state.usage.reasoningTokens || 0) + reasoningTokens,
        requests: (state.usage.requests || 0) + 1,
        models: state.usage.models || {},
      };

      // Update per-model usage
      if (model) {
        if (!state.usage.models[model]) {
          state.usage.models[model] = {
            promptTokens: 0,
            completionTokens: 0,
            reasoningTokens: 0,
            totalTokens: 0,
            requests: 0,
          };
        }

        state.usage.models[model] = {
          promptTokens: state.usage.models[model].promptTokens + promptTokens,
          completionTokens:
            state.usage.models[model].completionTokens + completionTokens,
          reasoningTokens:
            state.usage.models[model].reasoningTokens + reasoningTokens,
          totalTokens: state.usage.models[model].totalTokens + totalTokens,
          requests: state.usage.models[model].requests + 1,
        };
      }

      notify(id);
    },
    [id]
  );

  const processFile = useCallback(
    async (file: File) => {
      if (!enabledFeatures.fileHandling) {
        throw new Error("File handling is not enabled");
      }

      validateFile(file);

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const chunkSize = 8192;
      const chunks: string[] = [];

      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        let binary = "";
        for (let j = 0; j < chunk.length; j++) {
          binary += String.fromCharCode(chunk[j]);
        }
        chunks.push(binary);
      }

      const base64 = btoa(chunks.join(""));

      return {
        type: file.type,
        name: file.name,
        size: file.size,
        url: `data:${file.type};base64,${base64}`,
        processed: true,
      };
    },
    [enabledFeatures.fileHandling]
  );

  const processBatchedChunks = useCallback(
    async (assistantId: string) => {
      if (chunkBatchRef.current.length === 0) return;

      const batch = chunkBatchRef.current.splice(0, 10);

      try {
        const pool = getWorkerPool();
        const result: {
          updates?: Array<{ type: string; data: any }>;
        } = await pool.execute({
          type: "process-batch",
          batch,
          assistantId,
          features: enabledFeatures,
        });

        if (!isMountedRef.current) return;

        if (result.updates && result.updates.length > 0) {
          updateMessage(assistantId, (msg) => {
            const newMsg = { ...msg };

            result.updates?.forEach((update: any) => {
              const updateType = update.type;

              if (updateType === "text") {
                const idx = newMsg.parts.findIndex(
                  (p: any) => p.type === "text"
                );

                if (!textAccumRef.current[assistantId]) {
                  textAccumRef.current[assistantId] = "";
                }

                const fullText =
                  textAccumRef.current[assistantId] + update.data.text;
                textAccumRef.current[assistantId] = fullText;

                if (idx >= 0) {
                  newMsg.parts[idx] = {
                    ...(newMsg.parts[idx] as any),
                    text: fullText,
                    state: "streaming",
                  };
                } else {
                  newMsg.parts.push({
                    type: "text",
                    text: fullText,
                    state: "streaming",
                  });
                }
                return;
              }

              if (updateType === "reasoning" || updateType === "thinking") {
                const accKey = `${assistantId}-${updateType}`;
                if (!reasoningAccumRef.current[accKey])
                  reasoningAccumRef.current[accKey] = "";

                /* 1. append delta */
                reasoningAccumRef.current[accKey] += update.data.text;

                /* 2. find or create part */
                const idx = newMsg.parts.findIndex(
                  (p: any) => p.type === updateType
                );
                if (idx >= 0) {
                  const part = newMsg.parts[idx] as any;
                  part.text = reasoningAccumRef.current[accKey]; // <-- full accumulated
                  part.state = "streaming";
                  part._gen = (part._gen ?? 0) + 1; // force React key change
                } else {
                  newMsg.parts.push({
                    type: updateType,
                    text: reasoningAccumRef.current[accKey],
                    state: "streaming",
                    _gen: 1,
                  });
                }
                return;
              }

              if (updateType === "finish") {
                newMsg.parts = newMsg.parts.map((p: any) =>
                  p.type === "text" ||
                  p.type === "reasoning" ||
                  p.type === "thinking"
                    ? { ...p, state: "done" }
                    : p
                );
                isStreamingRef.current.delete(assistantId);
                delete textAccumRef.current[assistantId];
                Object.keys(reasoningAccumRef.current).forEach((key) => {
                  if (key.startsWith(assistantId)) {
                    delete reasoningAccumRef.current[key];
                  }
                });
                return;
              }

              const idx = newMsg.parts.findIndex(
                (p: any) => p.type === updateType
              );
              if (idx >= 0) {
                newMsg.parts[idx] = { ...update.data };
              } else {
                newMsg.parts.push(update.data);
              }
            });

            return newMsg;
          });
        }
      } catch (err) {
        console.error("Batch processing error:", err);
      }

      if (chunkBatchRef.current.length > 0) {
        await processBatchedChunks(assistantId);
      }
    },
    [updateMessage, enabledFeatures]
  );

  const handleChunk = useCallback(
    (data: string, assistantId: string) => {
      chunkBatchRef.current.push(data);

      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      if (chunkBatchRef.current.length >= 10) {
        processBatchedChunks(assistantId);
      } else {
        batchTimeoutRef.current = setTimeout(() => {
          processBatchedChunks(assistantId);
        }, CONFIG.UI_UPDATE_DEBOUNCE_MS);
      }
    },
    [processBatchedChunks]
  );

  const append = useCallback(
    async (
      msg:
        | UIMessage
        | { role: "user"; content: string; data?: any; files?: File[] },
      retryCount = 0
    ) => {
      if (state.isLoading) return;

      if (!state.rateLimiter.canMakeRequest()) {
        const error = new Error("Rate limit exceeded. Please try again later.");
        setError(error);
        onError?.(error);
        return;
      }

      setIsLoading(true);
      setError(undefined);

      const userMsg =
        "content" in msg
          ? createMessage("user", sanitizeInput(msg.content), msg.data)
          : msg;

      if (
        "files" in msg &&
        msg.files &&
        msg.files.length > 0 &&
        enabledFeatures.fileHandling
      ) {
        try {
          const processedFiles = await Promise.all(
            msg.files.map((f) => processFile(f))
          );
          userMsg.parts.push(
            ...processedFiles.map((pf: any) => ({
              type: "file" as const,
              mediaType: pf.type,
              filename: pf.name,
              url: pf.url,
            }))
          );
        } catch (err) {
          console.error("File processing error:", err);
          const error =
            err instanceof Error ? err : new Error("File processing failed");
          setError(error);
          onError?.(error);
          setIsLoading(false);
          return;
        }
      }

      state.messages.push(userMsg);
      notify(id);

      const assistantMsg = createMessage("assistant");
      assistantMsg.status = "streaming";
      state.messages.push(assistantMsg);
      notify(id);

      abortRef.current = new AbortController();

      try {
        const reqBody = {
          model,
          messages: state.messages.slice(0, -1).map((m: UIMessage) => ({
            id: m.id,
            role: m.role,
            content: m.parts
              .filter((p) => p.type === "text")
              .map((p: any) => p.text)
              .join(""),
          })),
          features: enabledFeatures,
          ...body,
        };

        const headersObj = typeof headers === "function" ? headers() : headers;

        const res = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headersObj },
          body: JSON.stringify(reqBody),
          credentials,
          signal: abortRef.current.signal,
        });

        await onResponse?.(res);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (!isMountedRef.current) {
            reader.cancel();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");

          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const data = trimmed.slice(6);

              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === "usage") {
                  updateUsage({
                    promptTokens: parsed.data.promptTokens || 0,
                    completionTokens: parsed.data.completionTokens || 0,
                    reasoningTokens: parsed.data.reasoningTokens || 0,
                    totalTokens: parsed.data.totalTokens || 0,
                    model: model, // Pass current model
                  });
                  continue;
                }
              } catch {}

              handleChunk(data, assistantMsg.id);
            }
          }
        }

        if (batchTimeoutRef.current) {
          clearTimeout(batchTimeoutRef.current);
          batchTimeoutRef.current = null;
        }
        await processBatchedChunks(assistantMsg.id);

        debouncedNotifyRef.current?.flush();

        updateMessage(assistantMsg.id, (m: UIMessage) => {
          const finalized: UIMessage = {
            ...m,
            status: "ready" as const,
            parts: m.parts.map((p: any) =>
              p.state === "streaming" ? { ...p, state: "done" } : p
            ),
            metadata: m.metadata as M extends Record<string, any>
              ? M
              : { [key: string]: any },
          };
          onFinish?.(finalized);
          return finalized;
        });

        delete textAccumRef.current[assistantMsg.id];
        chunkBatchRef.current = [];
      } catch (err: any) {
        if (err.name === "AbortError") {
          setIsLoading(false);
          return;
        }

        const error = err instanceof Error ? err : new Error(String(err));

        if (retryCount < maxRetries && !error.message.includes("Rate limit")) {
          console.warn(`Retry attempt ${retryCount + 1}/${maxRetries}`);
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * Math.pow(2, retryCount))
          );

          state.messages = state.messages.filter(
            (m: UIMessage) => m.id !== assistantMsg.id
          );
          isStreamingRef.current.delete(assistantMsg.id);
          delete textAccumRef.current[assistantMsg.id];
          notify(id);

          return append(msg, retryCount + 1);
        }

        setError(error);
        onError?.(error);

        if (!keepLastMessageOnError) {
          state.messages = state.messages.filter(
            (m: UIMessage) => m.id !== assistantMsg.id
          );
          notify(id);
        }

        isStreamingRef.current.delete(assistantMsg.id);
        delete textAccumRef.current[assistantMsg.id];
        chunkBatchRef.current = [];
      } finally {
        setIsLoading(false);
        abortRef.current = null;

        if (batchTimeoutRef.current) {
          clearTimeout(batchTimeoutRef.current);
          batchTimeoutRef.current = null;
        }
      }
    },
    [
      id,
      model,
      api,
      body,
      credentials,
      headers,
      enabledFeatures,
      keepLastMessageOnError,
      maxRetries,
      retryDelay,
      onError,
      onFinish,
      onResponse,
      handleChunk,
      processBatchedChunks,
      processFile,
      setIsLoading,
      setError,
      updateMessage,
      updateUsage,
    ]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }

    chunkBatchRef.current = [];
    debouncedNotifyRef.current?.flush();
    setIsLoading(false);
  }, [setIsLoading]);

  const reload = useCallback(async () => {
    const lastUserIdx = state.messages.findLastIndex(
      (m: UIMessage) => m.role === "user"
    );
    if (lastUserIdx === -1) return;
    setMessages(state.messages.slice(0, lastUserIdx));
    await append(state.messages[lastUserIdx]);
  }, [append, setMessages]);

  const clear = useCallback(() => {
    state.messages = [];
    state.input = "";
    state.isLoading = false;
    state.error = undefined;
    state.usage = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      reasoningTokens: 0,
      requests: 0,
      models: {},
    };
    state.rateLimiter.reset();
    chunkBatchRef.current = [];
    isStreamingRef.current.clear();
    textAccumRef.current = {};
    notify(id);
  }, [id]);

  const regenerate = useCallback(async () => {
    const msgs = state.messages;
    const lastAssistantIdx = msgs.findLastIndex(
      (m: UIMessage) => m.role === "assistant"
    );

    if (lastAssistantIdx === -1) {
      console.warn("[useChat] No assistant message to regenerate");
      return;
    }

    const userMsgIdx = msgs
      .slice(0, lastAssistantIdx)
      .findLastIndex((m: UIMessage) => m.role === "user");

    if (userMsgIdx === -1) {
      console.warn("[useChat] No user message found before assistant message");
      return;
    }

    setMessages(msgs.slice(0, lastAssistantIdx));
    setMessages(msgs.slice(0, userMsgIdx));
    await append(msgs[userMsgIdx]);
  }, [append, setMessages]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent, opts?: any) => {
      e?.preventDefault();
      const trimmed = state.input.trim();
      if (!trimmed || state.isLoading) return;
      append({ role: "user", content: trimmed, ...opts });
      setInput("");
    },
    [append, setInput]
  );

  const getModelUsage = useCallback((modelId: string) => {
    return (
      state.usage.models?.[modelId] || {
        promptTokens: 0,
        completionTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        requests: 0,
      }
    );
  }, []);

  useEffect(() => {
    const isStreaming = isStreamingRef.current;
    const cleanupIsStreaming = () => {
      if (isStreaming) {
        isStreamingRef.current.clear();
      }
    };
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      debouncedNotifyRef.current?.cleanup();
      cleanupIsStreaming();
      textAccumRef.current = {};
    };
  }, []);

  return useMemo(
    () => ({
      messages: state.messages,
      error: state.error,
      isLoading: state.isLoading,
      input: state.input,
      usage: state.usage,
      features: enabledFeatures,
      append,
      stop,
      reload,
      setInput,
      handleSubmit,
      regenerate,
      handleInputChange: (e: any) => setInput(e.target.value),
      setMessages,
      clear,
      processFile,
      getModelUsage,
    }),
    [
      state.messages,
      state.error,
      state.isLoading,
      state.input,
      state.usage,
      enabledFeatures,
      append,
      stop,
      reload,
      setInput,
      regenerate,
      handleSubmit,
      setMessages,
      clear,
      processFile,
      getModelUsage,
    ]
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    workerPool?.terminate();
  });
}
