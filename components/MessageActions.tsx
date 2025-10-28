import { UIMessage } from "@/types/useChat";
import React, { memo, useCallback, useState } from "react";
import { toast } from "sonner";
import { Action, Actions } from "./ai-elements/actions";
import { Check, CopyIcon, RefreshCcwIcon } from "lucide-react";

interface Props {
  messages: UIMessage[];
  part: UIMessage["parts"][0];
  regenerate: () => void;
}

export const MessageActions = memo(function MessageActions({
  messages,
  part,
  regenerate,
}: Props) {
  const msg = messages[0];
  const [copy, setCopy] = useState(false);
  // In ConversationScreen component
  // Simple condition without useEffect

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
    (part) => "state" in part && part.state === "streaming"
  );
  return (
    <div>
      {msg.role === "user" ? (
        <>
          {part.type === "text" && isStreamingComplete && (
            <Actions className="pt-2">
              <Action onClick={() => handleCopy(part.text)} label="Copy">
                {copy ? (
                  <Check className="size-3 text-white" />
                ) : (
                  <CopyIcon className="size-3 text-white" />
                )}
              </Action>
            </Actions>
          )}
        </>
      ) : (
        <>
          {part.type === "text" && isStreamingComplete && (
            <Actions className="pt-2">
              <Action onClick={() => handleCopy(part.text)} label="Copy">
                {copy ? (
                  <Check className="size-3" />
                ) : (
                  <CopyIcon className="size-3" />
                )}
              </Action>
              <Action onClick={regenerate} label="Copy">
                <RefreshCcwIcon className="size-3" />
              </Action>
            </Actions>
          )}
        </>
      )}
    </div>
  );
});
