import superjson from "superjson";
import type { PlanTier } from "../../helpers/schema";

export type OutputType = {
  plan: PlanTier;
  websitePlan: "one_page" | "premium_plus";
  isPremium: boolean;
  isPremiumPlus: boolean;
  source: "paid" | "trial" | "free";
   10	  trialDaysLeft: number;
   11	  trialEndsAt: Date | null;
   12	  renewsAt: Date | null;
   13	  lapsed: boolean;
   14	  productLimit: number | null;
   15	  productCount: number;
   16	  dailyCreationLimit: number | null;
   17	  canUseReports: boolean;
   18	  canCreateCollection: boolean;
   19	  canUseProductLinks: boolean;
   20	  canUseTrackingLinks: boolean;
   21	  canUseGalleries: boolean;
   22	  canUseBlog: boolean;
   23	  canUseServices: boolean;
   24	  priceNgn: number;
   25	  standardPriceNgn: number;
   26	  isLaunchPricing: boolean;
   27	  launchEndsAt: Date;
   28	  paymentsConfigured: boolean;
   29	  registrationPromoAvailable: boolean;
   30	  premiumTrialUsed: boolean;
   31	};
   32	
   33	export const getSubscriptionStatus = async (
   34	  init?: RequestInit,
   35	): Promise<OutputType> => {
   36	  const result = await fetch(`/_api/subscription/status`, {
   37	    method: "GET",
   38	    ...init,
   39	    headers: {
   40	      "Content-Type": "application/json",
   41	      ...(init?.headers ?? {}),
   42	    },
   43	  });
   44	  if (!result.ok) {
   45	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   46	    throw new Error(errorObject.error);
   47	  }
   48	  return superjson.parse<OutputType>(await result.text());
   49	};
