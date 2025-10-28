// components/MainChat.tsx
"use client";

import Composer from "./composer";
import { AnimatePresence, motion } from "framer-motion";
import ConversationScreen from "./ConversationScreen";
import { useChat } from "@/hooks/useChat";
import EmptyConversation from "./EmptyConversation";
import { useEffect, useState } from "react";
import { UseChatOptions } from "@/types/useChat";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

interface MainChatProps {
  chatId?: string;
}

export function MainChat({ chatId }: MainChatProps) {
  const [model, setModel] = useState("gpt-4o-mini");
  const chat = useChat<UseChatOptions>({
    id: chatId,
    persist: false,
    api: "/api/chat",
    model: model,
    features: {
      reasoning: true, // Enable chain-of-thought reasoning
      thinking: true, // Enable thinking process display
      toolCalling: true, // Enable tool/function calling
      workflow: true, // Enable workflow steps
      fileHandling: true, // Enable file uploads
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
    onFinish: (message) => {
      console.log("Chat finished:", message.id);
    },
    onToolCall: (tool) => {
      console.log("Tool called:", tool.toolName);
    },
    onWorkflowStep: (step) => {
      console.log("Workflow step:", step.title, step.status);
    },
  });

  const parentRef = useRef<HTMLDivElement>(null);

  // Fix: Better estimate size and proper measurement
  /* -------------------------------------------------- */
  /* 1️⃣  stable key for the message that is streaming   */
  const streamingKeyRef = useRef<string>("");
  const lastFinishedIdRef = useRef<string>("");

  useEffect(() => {
    const last = chat.messages.at(-1);
    if (!last) return;

    // stream just started → remember the id
    if (chat.isLoading && lastFinishedIdRef.current !== last.id) {
      streamingKeyRef.current = last.id;
    }
    // stream just finished → remember we finished
    if (!chat.isLoading) {
      lastFinishedIdRef.current = last.id;
    }
  }, [chat.messages, chat.isLoading]);
  /* -------------------------------------------------- */

  const virtual = useVirtualizer({
    count: chat.messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  /* ---------- auto-scroll ---------- */
  useEffect(() => {
    if (!chat.isLoading) return;
    const lastIndex = chat.messages.length - 1;
    virtual.scrollToIndex(lastIndex, { align: "end", behavior: "auto" });
  }, [chat.messages.length, chat.isLoading, virtual]);
  return (
    <AnimatePresence>
      <div className={`flex flex-col h-[97vh] top-2 w-full`}>
        {/* Messages area - only this part scrolls */}
        <div
          ref={parentRef}
          className="flex-1 overflow-y-auto wrap-break-word whitespace-pre-wrap w-full"
        >
          {chat.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <EmptyConversation />
            </div>
          ) : (
            <div
              style={{
                height: `${virtual.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtual.getVirtualItems().map((virtualItem) => {
                const msg = chat.messages[virtualItem.index];

                /* 2️⃣  use stable key while streaming */
                const rowKey =
                  chat.isLoading &&
                  virtualItem.index === chat.messages.length - 1
                    ? streamingKeyRef.current // same key while streaming
                    : msg.id; // normal key otherwise

                return (
                  <div
                    key={rowKey}
                    data-index={virtualItem.index}
                    ref={virtual.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div
                      className={
                        virtualItem.index === 0
                          ? "pt-4"
                          : virtualItem.index === chat.messages.length - 1
                          ? "pb-42"
                          : ""
                      }
                    >
                      <ConversationScreen
                        messages={[chat.messages[virtualItem.index]]}
                        regenerate={chat.regenerate}
                        isLoading={
                          chat.isLoading &&
                          virtualItem.index === chat.messages.length - 1
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="absolute bottom-0 z-50 w-full"
        >
          <Composer
            id={chatId!}
            input={chat.input}
            setInput={chat.setInput}
            handleSubmit={chat.handleSubmit}
            isLoading={chat.isLoading}
            model={model}
            setModel={setModel}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
