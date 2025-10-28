import React, { memo } from "react";
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

export const ReasoningResponse = memo(function ReasoningResponse({
  part,
  messages,
  partIndex,
}: ReasoningResponseProps) {
  // ✅ FIX: Check if this reasoning part is currently streaming
  // Don't depend on isLastPart or message status alone
  const isStreaming = part.state === "streaming";

  console.log("🎯 Reasoning state:", {
    partState: part.state,
    messageStatus: messages.status,
    partIndex,
    totalParts: messages.parts.length,
    isStreaming,
    textLength: part.text?.length,
    textPreview: part.text?.substring(0, 100),
  });

  return (
    <div className="reasoning-response">
      <Reasoning className="w-full" isStreaming={isStreaming}>
        <ReasoningTrigger />
        <ReasoningContent>
          {part.text ||
            (isStreaming ? "Thinking..." : "No reasoning available")}
        </ReasoningContent>
      </Reasoning>
    </div>
  );
});

ReasoningResponse.displayName = "ReasoningResponse";
