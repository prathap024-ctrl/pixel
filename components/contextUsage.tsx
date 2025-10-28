import { useChat } from "@/hooks/useChat";
import { memo, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { getPricing } from "@/lib/utils";

interface UsageChatProps {
  maxTokens?: number;
  modelId?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  onTokensExhausted?: () => void;
}

export const UsageChat = memo(function UsageChat({
  maxTokens = 100_000,
  modelId,
  warningThreshold = 80,
  criticalThreshold = 95,
  onTokensExhausted,
}: UsageChatProps) {
  const { usage } = useChat();

  const lastNotifiedStateRef = useRef<{
    level: "normal" | "warning" | "critical" | "exhausted";
    tokens: number;
  }>({ level: "normal", tokens: 0 });
  const hasShownInitialRef = useRef(false);

  const PRICING = getPricing(modelId);
  const USD_TO_INR = 83.5;

  const safeNumber = (v: any): number => {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  const promptTokens = safeNumber(usage.promptTokens);
  const completionTokens = safeNumber(usage.completionTokens);
  const reasoningTokens = safeNumber((usage as any).reasoningTokens);
  const totalTokensFromUsage = safeNumber(usage.totalTokens);
  const requests = safeNumber(usage.requests);

  const inputCostUSD = (promptTokens / 1000) * PRICING.input;
  const outputCostUSD = (completionTokens / 1000) * PRICING.output;
  const reasoningCostUSD = (reasoningTokens / 1000) * (PRICING?.reasoning ?? 0);
  const totalCostUSD =
    inputCostUSD + outputCostUSD + reasoningCostUSD

  const inputCost = inputCostUSD * USD_TO_INR;
  const outputCost = outputCostUSD * USD_TO_INR;
  const reasoningCost = reasoningCostUSD * USD_TO_INR;
  const totalCost = totalCostUSD * USD_TO_INR;

  const usedTokens = totalTokensFromUsage;
  const remainingTokens = maxTokens - usedTokens;
  const usagePercent = (usedTokens / maxTokens) * 100;

  const isWarning =
    usagePercent >= warningThreshold && usagePercent < criticalThreshold;
  const isCritical = usagePercent >= criticalThreshold;
  const isExhausted = remainingTokens <= 0;

  const currentLevel = isExhausted
    ? "exhausted"
    : isCritical
    ? "critical"
    : isWarning
    ? "warning"
    : "normal";

  useEffect(() => {
    const last = lastNotifiedStateRef.current;
    if (!hasShownInitialRef.current && requests > 0) {
      hasShownInitialRef.current = true;
      toast.info("ℹ️ Usage Tracking Active", {
        description: `Token limit: ${maxTokens.toLocaleString()} | Model: ${modelId}`,
        duration: 3000,
      });
    }
    if (currentLevel === last.level) return;
    lastNotifiedStateRef.current = { level: currentLevel, tokens: usedTokens };

    if (isExhausted) {
      toast.error("🚨 Tokens Exhausted", {
        description: `You have used all ${maxTokens.toLocaleString()} tokens.`,
        duration: 0,
      });
      onTokensExhausted?.();
    } else if (isCritical) {
      toast.error("⚠️ Critical: Token Limit Almost Reached", {
        description: `${usagePercent.toFixed(
          1
        )}% used. Only ${remainingTokens.toLocaleString()} tokens remaining.`,
        duration: 5000,
      });
    } else if (isWarning) {
      toast.warning("⚠️ Warning: Token Usage High", {
        description: `${usagePercent.toFixed(
          1
        )}% used. ${remainingTokens.toLocaleString()} tokens remaining.`,
        duration: 4000,
      });
    }
  }, [
    currentLevel,
    isExhausted,
    isCritical,
    isWarning,
    usagePercent,
    usedTokens,
    maxTokens,
    remainingTokens,
    requests,
    modelId,
    onTokensExhausted,
  ]);

  const getStatusColor = () => {
    if (isExhausted) return "border-destructive bg-destructive/10";
    if (isCritical) return "border-destructive/60 bg-destructive/5";
    if (isWarning)
      return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
    return "border-border bg-background rounded-2xl";
  };

  const getProgressColor = () => {
    if (isExhausted) return "bg-destructive";
    if (isCritical) return "bg-destructive/80";
    if (isWarning) return "bg-yellow-500";
    return "bg-primary";
  };

  const getStatusText = () => {
    if (isExhausted) return "Exhausted";
    if (isCritical) return "Critical";
    if (isWarning) return "Warning";
    return "Normal";
  };

  const formatINR = (amt: number) =>
    amt.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <Dialog>
      <DialogTrigger className="cursor-pointer bg-accent py-1 px-2 rounded-full">
        {usagePercent.toFixed(1)}%
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Token Usage</DialogTitle>

          {/* everything below lives INSIDE DialogDescription */}
          <DialogDescription asChild>
            <section className={`${getStatusColor()} transition-colors`}>
              {/* ------- header ------- */}
              <p className="mb-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Model: {modelId}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    isExhausted || isCritical
                      ? "bg-red-200 text-red-800"
                      : isWarning
                      ? "bg-yellow-200 text-yellow-800"
                      : "bg-green-200 text-green-800"
                  }`}
                >
                  {getStatusText()}
                </span>
              </p>

              {/* ------- stats ------- */}
              <p className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <span className="bg-background p-3">
                  <span className="text-xs text-muted-foreground">Used</span>
                  <br />
                  <span className="text-lg font-bold text-muted-foreground">
                    {usedTokens.toLocaleString()}
                  </span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {usagePercent.toFixed(1)}%
                  </span>
                </span>

                <span className="bg-background p-3">
                  <span className="text-xs text-muted-foreground">
                    Remaining
                  </span>
                  <br />
                  <span
                    className={`text-lg font-bold ${
                      remainingTokens <= 0
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {remainingTokens.toLocaleString()}
                  </span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    of {maxTokens.toLocaleString()}
                  </span>
                </span>

                <span className="bg-background p-3">
                  <span className="text-xs text-muted-foreground">
                    Requests
                  </span>
                  <br />
                  <span className="text-lg font-bold text-muted-foreground">
                    {usage.requests}
                  </span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    API calls
                  </span>
                </span>

                <span className="bg-background p-3">
                  <span className="text-xs text-muted-foreground">
                    Total Cost
                  </span>
                  <br />
                  <span className="text-lg font-bold text-muted-foreground">
                    {formatINR(totalCost)}
                  </span>
                  <br />
                  <span className="text-xs text-muted-foreground">INR</span>
                </span>
              </p>

              {/* ------- progress bar ------- */}
              <p className="mb-4">
                <span className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Progress
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {usagePercent.toFixed(1)}%
                  </span>
                </span>
                <span className="block h-3 overflow-hidden rounded-full bg-gray-400">
                  <span
                    className={`block h-full transition-all duration-300 ${getProgressColor()}`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </span>
              </p>

              {/* ------- token breakdown ------- */}
              <p className="bg-background p-3 mb-4">
                <span className="mb-2 block text-sm font-semibold text-muted-foreground">
                  Token Breakdown
                </span>
                <span className="space-y-2 text-sm">
                  <span className="flex justify-between">
                    <span className="text-muted-foreground">
                      Prompt Tokens:
                    </span>
                    <span className="font-medium text-muted-foreground">
                      {usage.promptTokens.toLocaleString()} (
                      {formatINR(inputCost)})
                    </span>
                  </span>

                  <span className="flex justify-between">
                    <span className="text-muted-foreground">
                      Completion Tokens:
                    </span>
                    <span className="font-medium text-muted-foreground">
                      {usage.completionTokens.toLocaleString()} (
                      {formatINR(outputCost)})
                    </span>
                  </span>

                  {(usage as any).reasoningTokens > 0 && (
                    <span className="flex justify-between">
                      <span className="text-muted-foreground">
                        Reasoning Tokens:
                      </span>
                      <span className="font-medium text-muted-foreground">
                        {(usage as any).reasoningTokens?.toLocaleString()} (
                        {formatINR(reasoningCost)})
                      </span>
                    </span>
                  )}

                  <span className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="font-semibold text-muted-foreground">
                      Total:
                    </span>
                    <span className="font-semibold text-muted-foreground">
                      {usage.totalTokens.toLocaleString()} (
                      {formatINR(totalCost)})
                    </span>
                  </span>
                </span>
              </p>

              {/* ------- status messages ------- */}
              {isExhausted && (
                <p className="bg-red-100 p-3 text-sm text-red-800">
                  <span className="font-semibold">🚨 Token Limit Reached</span>
                  <br />
                  All {maxTokens.toLocaleString()} tokens have been used.
                  Requests are disabled.
                </p>
              )}
              {isCritical && !isExhausted && (
                <p className="bg-red-100 p-3 text-sm text-red-800">
                  <span className="font-semibold">⚠️ Critical Usage Level</span>
                  <br />
                  You are approaching the token limit. Only{" "}
                  {remainingTokens.toLocaleString()} tokens remaining.
                </p>
              )}
              {isWarning && !isCritical && !isExhausted && (
                <p className="bg-yellow-100 p-3 text-sm text-yellow-800">
                  <span className="font-semibold">⚠️ High Usage</span>
                  <br />
                  Token usage is at {usagePercent.toFixed(1)}%. Consider your
                  usage patterns.
                </p>
              )}
            </section>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
