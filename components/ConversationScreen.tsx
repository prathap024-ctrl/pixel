import type { UIMessage } from "@/types/useChat";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useCallback, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./ai-elements/conversation";
import { Message, MessageContent } from "./ai-elements/message";
import { TextResponse } from "./TextResponse";
import { ReasoningResponse } from "./ReasoningResponse";
import { CopyCheck, CopyIcon, RefreshCcwIcon } from "lucide-react";
import { Action, Actions } from "./ai-elements/actions";
import { toast } from "sonner";
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
  const msg = messages[0]; // virtualiser gives us one at a time
  const [copy, setCopy] = useState(false);
  // In ConversationScreen component
  // Simple condition without useEffect
  const showLoader =
    isLoading &&
    msg.id === messages.at(-1)?.id &&
    msg.parts.every((part) => part.text.length === 0);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopy(true);
    toast.success("Copied to clipboard", {
      duration: 1000,
      description: "Copied to clipboard",
      closeButton: true,
    });
    setTimeout(() => setCopy(false), 1000);
  }, []);

  const isStreamingComplete = !msg.parts.some(
    (part) => part.state === "streaming"
  );

  return (
    <div>
      <AnimatePresence mode="wait">
        <Conversation>
          <ConversationContent>
            <motion.div
              key={msg.id}
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
                      case "text":
                        return (
                          <div key={key} className="relative">
                            <TextResponse part={part} />
                            {/* Add action buttons for text parts */}
                            {msg.role === "assistant" &&
                              part.text &&
                              isStreamingComplete && (
                                <Actions className="pt-2">
                                  <Action
                                    onClick={() => handleCopy(part.text)}
                                    label="Copy"
                                  >
                                    {copy ? (
                                      <CopyCheck className="size-3" />
                                    ) : (
                                      <CopyIcon className="size-3" />
                                    )}
                                  </Action>
                                  <Action onClick={regenerate} label="Copy">
                                    <RefreshCcwIcon className="size-3" />
                                  </Action>
                                </Actions>
                              )}
                          </div>
                        );
                      case "reasoning":
                        return (
                          <div key={key} className="relative">
                            <ReasoningResponse
                              key={key}
                              part={part}
                              isStreaming={
                                part.state === "streaming" &&
                                idx === msg.parts.length - 1
                              }
                            />
                            {/* Add action buttons for reasoning parts if they have text */}
                            {msg.role === "assistant" &&
                              part.text &&
                              isStreamingComplete && (
                                <Actions className="pt-2">
                                  <Action
                                    onClick={() => handleCopy(part.text)}
                                    label="Copy"
                                  >
                                    {copy ? (
                                      <CopyCheck className="size-3" />
                                    ) : (
                                      <CopyIcon className="size-3" />
                                    )}
                                  </Action>
                                  <Action onClick={regenerate} label="Copy">
                                    <RefreshCcwIcon className="size-3" />
                                  </Action>
                                </Actions>
                              )}
                          </div>
                        );
                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            </motion.div>

            {/* loader only on the very last message */}
            {showLoader && (
              <div className="flex flex-col max-w-[300px]">
                <SidebarMenuSkeleton />
                <SidebarMenuSkeleton />
              </div>
            )}
          </ConversationContent>

          {/* scroll-to-bottom button still works because the outer
              Conversation component measures the real DOM height */}
          <ConversationScrollButton />
        </Conversation>
      </AnimatePresence>
    </div>
  );
}

export default memo(ConversationScreen);
