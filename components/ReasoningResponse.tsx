import React from "react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "./ai-elements/reasoning";
import { UIMessage } from "@/types/useChat";

interface ReasoningResponseProps {
  part: Extract<UIMessage["parts"][0], { type: "reasoning" }>;
  messages: UIMessage;
  partIndex: number;
}

export function ReasoningResponse({
  part,
  messages,
  partIndex,
}: ReasoningResponseProps) {
  // More flexible streaming detection
  const isStreaming = part.state === "streaming";
  const hasContent = part.text && part.text.length > 0;

  // Don't render empty reasoning during streaming
  if (!hasContent && isStreaming) {
    return null;
  }

  // Don't render empty reasoning that's done
  if (!hasContent && part.state === "done") {
    return null;
  }

  return (
    <div className="reasoning-response">
      <Reasoning
        className="w-full"
        isStreaming={isStreaming}
        key={(part as any)._gen} // Use generation counter to force re-renders
      >
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    </div>
  );
}

ReasoningResponse.displayName = "ReasoningResponse";
