import type { UIMessage } from "@/types/useChat";
import { AnimatePresence, motion } from "framer-motion";
import { memo } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./ai-elements/conversation";
import { Message, MessageContent } from "./ai-elements/message";
import { TextResponse } from "./TextResponse";
import { ReasoningResponse } from "./ReasoningResponse";
import { SidebarMenuSkeleton } from "./ui/sidebar";
import { MessageActions } from "./MessageActions";

interface Props {
  messages: UIMessage[];
  isLoading: boolean;
  regenerate: () => void;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -20,
  },
};
function ConversationScreen({ messages, isLoading, regenerate }: Props) {
  /* 1. pick the message we want to show */
  const msg = messages[0];

  /* 2. decide whether we are still streaming this message */
  const isStreaming =
    isLoading &&
    messages.at(-1)?.id === msg.id &&
    msg.parts.at(-1)?.type === "text";

  /* 3. stable key: id while streaming, id+finished once done */
  const stableKey = isStreaming ? msg.id : `${msg.id}-finished`;

  /* 4. show skeleton only on the very last empty message */
  const showLoader =
    isLoading &&
    msg.id === messages.at(-1)?.id &&
    msg.parts.every((p) => !("text" in p) || p.text.length === 0);

  return (
    <div>
      <AnimatePresence mode="wait">
        <Conversation>
          <ConversationContent>
            <motion.div
              key={stableKey} // ← stable while streaming
              initial="initial"
              animate="animate"
              exit="exit"
              variants={fadeInUp}
              className="group"
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}
            >
              <Message from={msg.role}>
                <MessageContent>
                  {msg.parts.map((part, idx) => {
                    const key = `${msg.id}-${idx}`;
                    switch (part.type) {
                      case "reasoning":
                        return (
                          <div key={key} className="relative">
                            <ReasoningResponse
                              part={part}
                              messages={msg}
                              partIndex={idx}
                            />
                            <MessageActions
                              part={part}
                              messages={messages}
                              regenerate={regenerate}
                            />
                          </div>
                        );
                      case "text":
                        return (
                          <div key={key} className="relative">
                            <TextResponse part={part} />
                            <MessageActions
                              part={part}
                              messages={messages}
                              regenerate={regenerate}
                            />
                          </div>
                        );
                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            </motion.div>

            {msg.parts.length === 0 && showLoader && (
              <div className="flex flex-col max-w-[300px]">
                <SidebarMenuSkeleton />
                <SidebarMenuSkeleton />
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </AnimatePresence>
    </div>
  );
}

export default memo(ConversationScreen);
