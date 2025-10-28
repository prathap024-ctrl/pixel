
export type PlanTier = "free" | "starter" | "pro" | "enterprise";

export interface PlanLimits {
  messages: number;
  tokens: number;
  files: number;
  conversations: number;
  apiCalls: number;
  storage: number; // in MB
  teamMembers: number;
  customModels: boolean;
  prioritySupport: boolean;
  advancedAnalytics: boolean;
  apiAccess: boolean;
  whiteLabel: boolean;
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  price: number;
  interval: "month" | "year";
  limits: PlanLimits;
  features: string[];
  highlighted?: boolean;
}

export interface UsePlanReturn {
  plan: Plan;
  plans: Plan[];
  isLoading: boolean;
  error: Error | null;

  // Plan actions
  upgradePlan: (planId: string) => Promise<boolean>;
  downgradePlan: (planId: string) => Promise<boolean>;
  cancelPlan: () => Promise<boolean>;

  // Plan checks
  canAccessFeature: (feature: keyof PlanLimits) => boolean;
  isFeatureAvailable: (feature: string) => boolean;
  getPlanBadgeColor: () => string;

  // Comparison
  comparePlans: (planId1: string, planId2: string) => PlanComparison;
  getUpgradeRecommendation: () => Plan | null;
}

export interface PlanComparison {
  plan1: Plan;
  plan2: Plan;
  differences: {
    feature: string;
    plan1Value: any;
    plan2Value: any;
    better: "plan1" | "plan2" | "equal";
  }[];
}
