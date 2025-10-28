// hooks/usePlan.ts
import { Plan, PlanComparison, PlanLimits, UsePlanReturn } from "@/types/usePlan";
import { useState, useEffect, useCallback } from "react";

const PLANS: Plan[] = [
  {
    id: "free",
    tier: "free",
    name: "Free",
    price: 0,
    interval: "month",
    limits: {
      messages: 50,
      tokens: 10000,
      files: 5,
      conversations: 3,
      apiCalls: 100,
      storage: 10,
      teamMembers: 1,
      customModels: false,
      prioritySupport: false,
      advancedAnalytics: false,
      apiAccess: false,
      whiteLabel: false,
    },
    features: [
      "50 messages per month",
      "10K tokens",
      "5 file uploads",
      "3 conversations",
      "Basic models",
      "Community support",
    ],
  },
  {
    id: "starter",
    tier: "starter",
    name: "Starter",
    price: 19,
    interval: "month",
    limits: {
      messages: 500,
      tokens: 100000,
      files: 50,
      conversations: 25,
      apiCalls: 1000,
      storage: 100,
      teamMembers: 3,
      customModels: false,
      prioritySupport: false,
      advancedAnalytics: false,
      apiAccess: true,
      whiteLabel: false,
    },
    features: [
      "500 messages per month",
      "100K tokens",
      "50 file uploads",
      "25 conversations",
      "Advanced models",
      "API access",
      "Email support",
      "Up to 3 team members",
    ],
    highlighted: false,
  },
  {
    id: "pro",
    tier: "pro",
    name: "Professional",
    price: 49,
    interval: "month",
    limits: {
      messages: 2000,
      tokens: 500000,
      files: 200,
      conversations: 100,
      apiCalls: 5000,
      storage: 500,
      teamMembers: 10,
      customModels: true,
      prioritySupport: true,
      advancedAnalytics: true,
      apiAccess: true,
      whiteLabel: false,
    },
    features: [
      "2,000 messages per month",
      "500K tokens",
      "200 file uploads",
      "100 conversations",
      "All models (including GPT-4)",
      "Custom model training",
      "Priority support",
      "Advanced analytics",
      "API access",
      "Up to 10 team members",
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    tier: "enterprise",
    name: "Enterprise",
    price: 199,
    interval: "month",
    limits: {
      messages: -1, // Unlimited
      tokens: -1,
      files: -1,
      conversations: -1,
      apiCalls: -1,
      storage: -1,
      teamMembers: -1,
      customModels: true,
      prioritySupport: true,
      advancedAnalytics: true,
      apiAccess: true,
      whiteLabel: true,
    },
    features: [
      "Unlimited messages",
      "Unlimited tokens",
      "Unlimited file uploads",
      "Unlimited conversations",
      "All models + custom models",
      "Dedicated support",
      "Advanced analytics + BI tools",
      "Full API access",
      "White-label solution",
      "Unlimited team members",
      "SLA guarantee",
      "Custom integrations",
    ],
    highlighted: false,
  },
];

const STORAGE_KEY = "user_plan";
const API_ENDPOINT = "/api/plan";

export function usePlan(userId?: string): UsePlanReturn {
  const [currentPlan, setCurrentPlan] = useState<Plan>(PLANS[0]); // Default to free
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load plan from localStorage or server
  useEffect(() => {
    loadPlan();
  }, [userId]);

  const loadPlan = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try localStorage first
      const storedPlan = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (storedPlan) {
        const planData = JSON.parse(storedPlan);
        const plan = PLANS.find((p) => p.id === planData.id) || PLANS[0];
        setCurrentPlan(plan);
      }

      // Then fetch from server
      if (userId) {
        const response = await fetch(`${API_ENDPOINT}?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          const plan = PLANS.find((p) => p.id === data.planId) || PLANS[0];
          setCurrentPlan(plan);
          localStorage.setItem(
            `${STORAGE_KEY}_${userId}`,
            JSON.stringify({ id: plan.id })
          );
        }
      }
    } catch (err) {
      setError(err as Error);
      console.error("Failed to load plan:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Upgrade plan
  const upgradePlan = useCallback(
    async (planId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const newPlan = PLANS.find((p) => p.id === planId);
        if (!newPlan) throw new Error("Plan not found");

        // Call API to upgrade
        const response = await fetch(`${API_ENDPOINT}/upgrade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, planId }),
        });

        if (!response.ok) throw new Error("Failed to upgrade plan");

        setCurrentPlan(newPlan);
        localStorage.setItem(
          `${STORAGE_KEY}_${userId}`,
          JSON.stringify({ id: newPlan.id })
        );

        return true;
      } catch (err) {
        setError(err as Error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  // Downgrade plan
  const downgradePlan = useCallback(
    async (planId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const newPlan = PLANS.find((p) => p.id === planId);
        if (!newPlan) throw new Error("Plan not found");

        const response = await fetch(`${API_ENDPOINT}/downgrade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, planId }),
        });

        if (!response.ok) throw new Error("Failed to downgrade plan");

        setCurrentPlan(newPlan);
        localStorage.setItem(
          `${STORAGE_KEY}_${userId}`,
          JSON.stringify({ id: newPlan.id })
        );

        return true;
      } catch (err) {
        setError(err as Error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  // Cancel plan
  const cancelPlan = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_ENDPOINT}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) throw new Error("Failed to cancel plan");

      setCurrentPlan(PLANS[0]); // Revert to free plan
      localStorage.setItem(
        `${STORAGE_KEY}_${userId}`,
        JSON.stringify({ id: "free" })
      );

      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Check if feature is available
  const canAccessFeature = useCallback(
    (feature: keyof PlanLimits): boolean => {
      const limit = currentPlan.limits[feature];
      if (typeof limit === "boolean") return limit;
      return limit === -1 || limit > 0; // -1 means unlimited
    },
    [currentPlan]
  );

  const isFeatureAvailable = useCallback(
    (feature: string): boolean => {
      return currentPlan.features.some((f) =>
        f.toLowerCase().includes(feature.toLowerCase())
      );
    },
    [currentPlan]
  );

  // Get badge color
  const getPlanBadgeColor = useCallback((): string => {
    const colors = {
      free: "bg-gray-100 text-gray-800",
      starter: "bg-blue-100 text-blue-800",
      pro: "bg-purple-100 text-purple-800",
      enterprise: "bg-yellow-100 text-yellow-800",
    };
    return colors[currentPlan.tier] || colors.free;
  }, [currentPlan]);

  // Compare plans
  const comparePlans = useCallback(
    (planId1: string, planId2: string): PlanComparison => {
      const plan1 = PLANS.find((p) => p.id === planId1);
      const plan2 = PLANS.find((p) => p.id === planId2);

      if (!plan1 || !plan2) {
        throw new Error("Plans not found");
      }

      const differences: PlanComparison["differences"] = [];

      Object.keys(plan1.limits).forEach((key) => {
        const k = key as keyof PlanLimits;
        const val1 = plan1.limits[k];
        const val2 = plan2.limits[k];

        let better: "plan1" | "plan2" | "equal" = "equal";
        if (typeof val1 === "number" && typeof val2 === "number") {
          if (val1 === -1) better = "plan1";
          else if (val2 === -1) better = "plan2";
          else if (val1 > val2) better = "plan1";
          else if (val2 > val1) better = "plan2";
        } else if (typeof val1 === "boolean" && typeof val2 === "boolean") {
          if (val1 && !val2) better = "plan1";
          else if (val2 && !val1) better = "plan2";
        }

        differences.push({
          feature: key,
          plan1Value: val1,
          plan2Value: val2,
          better,
        });
      });

      return { plan1, plan2, differences };
    },
    []
  );

  // Get upgrade recommendation
  const getUpgradeRecommendation = useCallback((): Plan | null => {
    const currentIndex = PLANS.findIndex((p) => p.id === currentPlan.id);
    if (currentIndex === -1 || currentIndex === PLANS.length - 1) return null;

    return PLANS[currentIndex + 1];
  }, [currentPlan]);

  return {
    plan: currentPlan,
    plans: PLANS,
    isLoading,
    error,
    upgradePlan,
    downgradePlan,
    cancelPlan,
    canAccessFeature,
    isFeatureAvailable,
    getPlanBadgeColor,
    comparePlans,
    getUpgradeRecommendation,
  };
}
