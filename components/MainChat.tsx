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
import { useSidebarStore } from "@/stores/useDashboardStore";

interface MainChatProps {
  chatId?: string;
}

export function MainChat({ chatId }: MainChatProps) {
  const [model, setModel] = useState("gpt-4o-mini");
  const { isOpen } = useSidebarStore();
  const chat = useChat<UseChatOptions>({
    id: chatId,
    persist: true,
    api: "/api/chat",
    model: model,
    onError: (error) => {
      console.error("Chat error:", error);
    },
    onFinish: (message) => {
      console.log("Message finished:", message.id);
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
  const virtual = useVirtualizer({
    count: chat.messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Increased estimate to prevent gaps
    overscan: 5,
  });
  /* ---------- auto-scroll to bottom during streaming ---------- */
  const lastMessageRef = useRef(chat.messages[chat.messages.length - 1]);
  const isStreamingRef = useRef(chat.isLoading);

  useEffect(() => {
    isStreamingRef.current = chat.isLoading;
  }, [chat.isLoading]);

  useEffect(() => {
    const currentLastMessage = chat.messages[chat.messages.length - 1];
    const lastMessageChanged =
      lastMessageRef.current?.id !== currentLastMessage?.id;

    // Scroll when:
    // 1. New message arrives (user sends or AI starts streaming)
    // 2. During streaming of the last message
    // 3. When streaming finishes
    if (lastMessageChanged || chat.isLoading) {
      lastMessageRef.current = currentLastMessage;

      if (chat.messages.length > 0) {
        const lastIndex = chat.messages.length - 1;

        // Small delay to ensure DOM is updated for streaming content
        setTimeout(() => {
          virtual.scrollToIndex(lastIndex, {
            align: "end",
            behavior: isStreamingRef.current ? "smooth" : "auto",
          });
        }, 50);
      }
    }
  }, [chat.messages, chat.isLoading, virtual]);

  // Additional scroll trigger for streaming content updates
  useEffect(() => {
    if (chat.isLoading && chat.messages.length > 0) {
      // Scroll every time streaming content updates
      const scrollInterval = setInterval(() => {
        const lastIndex = chat.messages.length - 1;
        virtual.scrollToIndex(lastIndex, {
          align: "end",
        });
      }, 500); // Scroll every 500ms during streaming

      return () => clearInterval(scrollInterval);
    }
  }, [chat.isLoading, chat.messages.length, virtual]);

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
              {virtual.getVirtualItems().map((virtualItem) => (
                <div
                  key={virtualItem.key}
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
                        ? "pb-36"
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
              ))}
            </div>
          )}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
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
