import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { flutterwaveEnv } from "../../helpers/flutterwaveEnv";
import type { OutputType } from "./status_GET.schema";

export async function handle(request: Request) {
  try {
   10	    const { business } = await requireOwnedBusiness(request);
   11	    const resolved = subscriptionPlan.resolve(business);
   12	
   13	    const products = await db
   14	      .selectFrom("products")
   15	      .select(({ fn }) => fn.countAll<string>().as("count"))
   16	      .where("businessId", "=", business.id)
   17	      .executeTakeFirstOrThrow();
   18	
   19	    const output: OutputType = {
   20	      plan: resolved.isPremium ? "premium" : "free",
   21	      websitePlan: resolved.websitePlan,
   22	      isPremium: resolved.isPremium,
   23	      isPremiumPlus: resolved.isPremiumPlus,
   24	      source: resolved.source,
   25	      trialDaysLeft: resolved.trialDaysLeft,
   26	      trialEndsAt: resolved.trialEndsAt,
   27	      renewsAt: resolved.renewsAt,
   28	      lapsed: resolved.lapsed,
   29	      productLimit: resolved.productLimit,
   30	      productCount: Number(products.count),
   31	      dailyCreationLimit: resolved.dailyCreationLimit,
   32	      canUseReports: resolved.canUseReports,
   33	      canCreateCollection: resolved.canCreateCollection,
   34	      canUseProductLinks: resolved.canUseProductLinks,
   35	      canUseTrackingLinks: resolved.canUseTrackingLinks,
   36	      canUseGalleries: resolved.canUseGalleries,
   37	      canUseBlog: resolved.canUseBlog,
   38	      canUseServices: resolved.canUseServices,
   39	      priceNgn: subscriptionPlan.currentPriceNgn(),
   40	      standardPriceNgn: subscriptionPlan.standardPriceNgn,
   41	      isLaunchPricing: subscriptionPlan.isLaunchPricing(),
   42	      launchEndsAt: subscriptionPlan.launchEndsAt,
   43	      paymentsConfigured: Boolean(flutterwaveEnv().secretKey),
   44	      registrationPromoAvailable: !business.registrationPromoUsed,
   45	      premiumTrialUsed: resolved.trialUsed,
   46	    };
   47	
   48	    return new Response(superjson.stringify(output satisfies OutputType), {
   49	      headers: { "Content-Type": "application/json" },
   50	    });
   51	  } catch (error) {
   52	    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
   53	    return new Response(
   54	      superjson.stringify({
   55	        error: noBusiness ? "Create your business page first." : "Not authenticated",
   56	      }),
   57	      { status: noBusiness ? 400 : 401 },
   58	    );
   59	  }
   60	}
