import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MODEL_PRICING: Record<
  string,
  { input: number; output: number; reasoning?: number }
> = {
  /* ------------------ OpenAI ------------------ */
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-4-32k": { input: 0.06, output: 0.12 },

  /* ---------------- Anthropic ----------------- */
  "claude-3-haiku": { input: 0.00025, output: 0.00125 },
  "claude-3-sonnet": { input: 0.003, output: 0.015 },
  "claude-3-opus": { input: 0.015, output: 0.075 },

  /* --------------- Reasoning ----------------- */
  "openai:o1-mini": { input: 0.003, output: 0.012, reasoning: 0.015 },
  "openai:o1-preview": { input: 0.015, output: 0.06, reasoning: 0.06 },

  /* -------------- Google Gemini -------------- */
  "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
  "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
  "gemini-2.5-pro": { input: 0.00125, output: 0.005 },
  "gemini-2.5-flash": { input: 0.00125, output: 0.005 },
  "nvidia/nemotron-nano-9b-v2:free": { input: 0.000075, output: 0.020 },
};

export const getPricing = (modelId?: string) =>
  MODEL_PRICING[modelId ?? ""] ?? {
    input: 0.03,
    output: 0.06,
    reasoning: 0.12,
  };
