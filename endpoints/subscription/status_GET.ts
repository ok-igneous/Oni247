import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { flutterwaveEnv } from "../../helpers/flutterwaveEnv";
import { loadPlanConfig } from "../../helpers/planConfig";
import type { OutputType } from "./status_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    await loadPlanConfig();
    const resolved = subscriptionPlan.resolve(business);

    const products = await db
      .selectFrom("products")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .where("businessId", "=", business.id)
      .executeTakeFirstOrThrow();

    const output: OutputType = {
      plan: resolved.isPremium ? "premium" : "free",
      websitePlan: resolved.websitePlan,
      isPremium: resolved.isPremium,
      isPremiumPlus: resolved.isPremiumPlus,
      source: resolved.source,
      trialDaysLeft: resolved.trialDaysLeft,
      trialEndsAt: resolved.trialEndsAt,
      renewsAt: resolved.renewsAt,
      lapsed: resolved.lapsed,
      productLimit: resolved.productLimit,
      productCount: Number(products.count),
      dailyCreationLimit: resolved.dailyCreationLimit,
      canUseReports: resolved.canUseReports,
      canCreateCollection: resolved.canCreateCollection,
      canUseProductLinks: resolved.canUseProductLinks,
      canUseTrackingLinks: resolved.canUseTrackingLinks,
      canUseGalleries: resolved.canUseGalleries,
      canUseBlog: resolved.canUseBlog,
      canUseServices: resolved.canUseServices,
      priceNgn: subscriptionPlan.currentPriceNgn(),
      standardPriceNgn: subscriptionPlan.standardPriceNgn,
      isLaunchPricing: subscriptionPlan.isLaunchPricing(),
      launchEndsAt: subscriptionPlan.launchEndsAt,
      paymentsConfigured: Boolean((await flutterwaveEnv()).secretKey),
      registrationPromoAvailable: !business.registrationPromoUsed,
      premiumTrialUsed: resolved.trialUsed,
      planId: resolved.planId,
      planName: resolved.planName,
      features: resolved.features,
      plans: subscriptionPlan.catalog
        .filter((p) => p.active && p.id !== "free")
        .map((p) => ({ id: p.id, name: p.name, description: p.description, priceMonthlyNgn: p.priceMonthlyNgn, features: p.features, productLimit: p.productLimit, highlighted: p.highlighted })),
      maxDurationMonths: subscriptionPlan.maxDurationMonths,
      freePlan: (() => {
        const f = subscriptionPlan.planById("free");
        return f ? { id: f.id, name: f.name, description: f.description, priceMonthlyNgn: 0, features: f.features, productLimit: f.productLimit, highlighted: false } : undefined;
      })(),
      registrationPromoPercent: subscriptionPlan.registrationPromoPercent,
    };

    return new Response(superjson.stringify(output satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
    return new Response(
      superjson.stringify({
        error: noBusiness ? "Create your business page first." : "Not authenticated",
      }),
      { status: noBusiness ? 400 : 401 },
    );
  }
}
