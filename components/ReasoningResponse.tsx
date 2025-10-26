import React, { memo } from "react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "./ai-elements/reasoning";
import { ReasoningUIPart } from "@/types/useChat";

export const ReasoningResponse = memo(function ReasoningResponse({
  part,
  isStreaming,
}: {
  part: ReasoningUIPart;
  isStreaming: boolean;
}) {
  return (
    <div>
      <Reasoning className="w-full" isStreaming={isStreaming}>
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    </div>
  );
});
