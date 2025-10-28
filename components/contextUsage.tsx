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

interface UsageChatProps {
  maxTokens?: number;
  modelId?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  onTokensExhausted?: () => void;
}

export const UsageChat = memo(function UsageChat({
  maxTokens = 100_000,
  modelId = "openai:gpt-4",
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

  const PRICING = { input: 0.03, output: 0.06, reasoning: 0.12 };
  const USD_TO_INR = 83.5;

  const safeNumber = (v: any) => (Number.isNaN(Number(v)) ? 0 : Number(v));

  const promptTokens = safeNumber(usage.promptTokens);
  const completionTokens = safeNumber(usage.completionTokens);
  const reasoningTokens = safeNumber((usage as any).reasoningTokens);
  const totalTokensFromUsage = safeNumber(usage.totalTokens);
  const requests = safeNumber(usage.requests);

  const inputCostUSD = (promptTokens / 1000) * PRICING.input;
  const outputCostUSD = (completionTokens / 1000) * PRICING.output;
  const reasoningCostUSD = (reasoningTokens / 1000) * PRICING.reasoning;
  const totalCostUSD = inputCostUSD + outputCostUSD + reasoningCostUSD;

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
      <DialogTrigger className="cursor-pointer bg-accent py-1 px-2 rounded-full">{usagePercent.toFixed(1)}%</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Token Usage</DialogTitle>
          <DialogDescription asChild>
            <section className={`p-4 ${getStatusColor()} transition-colors`}>
              {/* Header */}
              <header className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Model: {modelId}
                </p>
                <span
                  className={` px-3 py-1 text-sm rounded-full font-medium ${
                    isExhausted || isCritical
                      ? "bg-red-200 text-red-800"
                      : isWarning
                      ? "bg-yellow-200 text-yellow-800"
                      : "bg-green-200 text-green-800"
                  }`}
                >
                  {getStatusText()}
                </span>
              </header>

              {/* Main Stats */}
              <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <article className=" bg-background p-3">
                  <p className="text-xs text-muted-foreground">Used</p>
                  <p className="text-lg font-bold text-muted-foreground">
                    {usedTokens.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {usagePercent.toFixed(1)}%
                  </p>
                </article>

                <article className=" bg-background p-3">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p
                    className={`text-lg font-bold ${
                      remainingTokens <= 0
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {remainingTokens.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    of {maxTokens.toLocaleString()}
                  </p>
                </article>

                <article className=" bg-background p-3">
                  <p className="text-xs text-muted-foreground">Requests</p>
                  <p className="text-lg font-bold text-muted-foreground">
                    {usage.requests}
                  </p>
                  <p className="text-xs text-muted-foreground">API calls</p>
                </article>

                <article className=" bg-background p-3">
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="text-lg font-bold text-muted-foreground">
                    {formatINR(totalCost)}
                  </p>
                  <p className="text-xs text-muted-foreground">INR</p>
                </article>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Progress
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {usagePercent.toFixed(1)}%
                  </p>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-400">
                  <div
                    className={`h-full transition-all duration-300 ${getProgressColor()}`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Token Breakdown */}
              <article className=" bg-background p-3 mb-4">
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                  Token Breakdown
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Prompt Tokens:
                    </span>
                    <span className="font-medium text-muted-foreground">
                      {usage.promptTokens.toLocaleString()} (
                      {formatINR(inputCost)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Completion Tokens:
                    </span>
                    <span className="font-medium text-muted-foreground">
                      {usage.completionTokens.toLocaleString()} (
                      {formatINR(outputCost)})
                    </span>
                  </div>
                  {(usage as any).reasoningTokens > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Reasoning Tokens:
                      </span>
                      <span className="font-medium text-muted-foreground">
                        {((usage as any).reasoningTokens || 0).toLocaleString()}{" "}
                        ({formatINR(reasoningCost)})
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="font-semibold text-muted-foreground">
                      Total:
                    </span>
                    <span className="font-semibold text-muted-foreground">
                      {usage.totalTokens.toLocaleString()} (
                      {formatINR(totalCost)})
                    </span>
                  </div>
                </div>
              </article>

              {/* Status Message */}
              {isExhausted && (
                <aside className=" bg-red-100 p-3 text-sm text-red-800">
                  <p className="font-semibold">🚨 Token Limit Reached</p>
                  <p>
                    All {maxTokens.toLocaleString()} tokens have been used.
                    Requests are disabled.
                  </p>
                </aside>
              )}
              {isCritical && !isExhausted && (
                <aside className=" bg-red-100 p-3 text-sm text-red-800">
                  <p className="font-semibold">⚠️ Critical Usage Level</p>
                  <p>
                    You are approaching the token limit. Only{" "}
                    {remainingTokens.toLocaleString()} tokens remaining.
                  </p>
                </aside>
              )}
              {isWarning && !isCritical && !isExhausted && (
                <aside className=" bg-yellow-100 p-3 text-sm text-yellow-800">
                  <p className="font-semibold">⚠️ High Usage</p>
                  <p>
                    Token usage is at {usagePercent.toFixed(1)}%. Consider your
                    usage patterns.
                  </p>
                </aside>
              )}
            </section>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
