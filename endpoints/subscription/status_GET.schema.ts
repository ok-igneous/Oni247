import superjson from "superjson";
import type { PlanTier } from "../../helpers/schema";

export type PublicPlan = {
  id: string;
  name: string;
  description: string;
  priceMonthlyNgn: number;
  features: string[];
  productLimit: number | null;
  highlighted: boolean;
};

export type OutputType = {
  plan: PlanTier;
  websitePlan: string;
  isPremium: boolean;
  isPremiumPlus: boolean;
  source: "paid" | "trial" | "free";
  trialDaysLeft: number;
  trialEndsAt: Date | null;
  renewsAt: Date | null;
  lapsed: boolean;
  productLimit: number | null;
  productCount: number;
  dailyCreationLimit: number | null;
  canUseReports: boolean;
  canCreateCollection: boolean;
  canUseProductLinks: boolean;
  canUseTrackingLinks: boolean;
  canUseGalleries: boolean;
  canUseBlog: boolean;
  canUseServices: boolean;
  priceNgn: number;
  standardPriceNgn: number;
  isLaunchPricing: boolean;
  launchEndsAt: Date;
  paymentsConfigured: boolean;
  registrationPromoAvailable: boolean;
  premiumTrialUsed: boolean;
  /** Added for the plan builder. Older app versions ignore these. */
  planId?: string;
  planName?: string;
  features?: string[];
  plans?: PublicPlan[];
  freePlan?: PublicPlan;
  maxDurationMonths?: number;
  registrationPromoPercent?: number;
};

export const getSubscriptionStatus = async (
  init?: RequestInit,
): Promise<OutputType> => {
  const result = await fetch(`/_api/subscription/status`, {
    method: "GET",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
