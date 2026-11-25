import { platformSettings } from "./platformSettings";
import { DEFAULT_PLANS, subscriptionPlan, type PlanDef } from "./subscriptionPlan";

/** The numbers that apply across every plan. Each plan's own price, features and limits live in the catalog. */
export type PlanConfig = {
  trialDays: number;
  trialPlanId: string;
  registrationPromoPercent: number;
  maxDurationMonths: number;
};
export const PLANS_KEY = "plans";
export const CATALOG_KEY = "planCatalog";

export const currentPlanConfig = (): PlanConfig => ({
  trialDays: subscriptionPlan.trialDays,
  trialPlanId: subscriptionPlan.trialPlanId,
  registrationPromoPercent: subscriptionPlan.registrationPromoPercent,
  maxDurationMonths: subscriptionPlan.maxDurationMonths,
});

type Legacy = Partial<PlanConfig> & { onePagePriceNgn?: number; premiumPlusPriceNgn?: number; freeProductLimit?: number; freeDailyCreationLimit?: number };

/** Backend only. Loads the plans and settings the Oni247 admin saved and applies them for this request. */
export const loadPlanConfig = async (): Promise<void> => {
  try {
    const [legacy, saved] = await Promise.all([platformSettings.get<Legacy>(PLANS_KEY), platformSettings.get<{ plans?: PlanDef[] }>(CATALOG_KEY)]);
    if (saved?.plans?.length) {
      subscriptionPlan.applyCatalog(saved.plans);
    } else {
      // Nothing saved in the new plan builder yet: start from the built-in plans, keeping any prices set earlier.
      const seed = DEFAULT_PLANS.map((p) => ({ ...p, features: [...p.features] }));
      for (const p of seed) {
        if (p.id === "one_page" && typeof legacy?.onePagePriceNgn === "number") p.priceMonthlyNgn = legacy.onePagePriceNgn;
        if (p.id === "premium_plus" && typeof legacy?.premiumPlusPriceNgn === "number") p.priceMonthlyNgn = legacy.premiumPlusPriceNgn;
        if (p.id === "free") {
          if (typeof legacy?.freeProductLimit === "number") p.productLimit = legacy.freeProductLimit;
          if (typeof legacy?.freeDailyCreationLimit === "number") p.dailyCreationLimit = legacy.freeDailyCreationLimit;
        }
      }
      subscriptionPlan.applyCatalog(seed);
    }
    if (legacy) subscriptionPlan.applyConfig(legacy);
  } catch {
    // Keep what is already loaded if settings cannot be read.
  }
};

