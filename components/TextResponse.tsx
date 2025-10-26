import React, { memo } from "react";
import { Response } from "./ai-elements/response";
import { TextUIPart } from "@/types/useChat";

export const TextResponse = memo(function TextResponse({
  part,
}: {
  part: TextUIPart;
}) {
  return (
    <div>
      <Response>{part.text}</Response>
    </div>
  );
});
