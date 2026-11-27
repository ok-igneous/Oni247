import type { PlanTier } from "./schema";
import { FEATURE_IDS, type FeatureId } from "./features";

export type PlanDef = {
  id: string;
  name: string;
  description: string;
  /** 0 for the free plan. */
  priceMonthlyNgn: number;
  features: FeatureId[];
  /** null means unlimited. */
  productLimit: number | null;
  dailyCreationLimit: number | null;
  highlighted: boolean;
  active: boolean;
  builtIn: boolean;
  sort: number;
};

const BASE: FeatureId[] = ["reports", "collections", "product_links", "tracking_links", "presence_edit"];

export const DEFAULT_PLANS: PlanDef[] = [
  { id: "free", name: "Free", description: "Start selling with the basics.", priceMonthlyNgn: 0, features: [], productLimit: 5, dailyCreationLimit: 2, highlighted: false, active: true, builtIn: true, sort: 0 },
  { id: "one_page", name: "One-Page Website", description: "A one-page website with products and WhatsApp ordering.", priceMonthlyNgn: 1500, features: [...BASE], productLimit: null, dailyCreationLimit: null, highlighted: false, active: true, builtIn: true, sort: 1 },
  {
    id: "premium_plus",
    name: "Premium Plus",
    description: "A full multi-page website with every selling and content tool.",
    priceMonthlyNgn: 3000,
    features: [...BASE, "multi_page", "galleries", "blog", "events", "forms", "advanced_media", "services", "email"],
    productLimit: null,
    dailyCreationLimit: null,
    highlighted: true,
    active: true,
    builtIn: true,
    sort: 2,
  },
];

const cloneDefaults = () => DEFAULT_PLANS.map((p) => ({ ...p, features: [...p.features] }));

export const subscriptionPlan = {
  /** The plans the Oni247 admin has set up (Admin → Plans). Starts as the built-in three. */
  catalog: cloneDefaults() as PlanDef[],
  onePagePriceNgn: 1500,
  premiumPlusPriceNgn: 3000,
  standardPriceNgn: 3000,
  launchPriceNgn: 3000,
  launchEndsAt: new Date("2099-12-31T23:59:59Z"),
  currency: "NGN",
  currentPriceNgn() {
    return this.premiumPlusPriceNgn;
  },
  isLaunchPricing() {
    return false;
  },
  registrationPromoPercent: 50,
  /** The plan a new shop tries during its one-time trial. */
  trialPlanId: "premium_plus",
  trialDays: 7,
  freeProductLimit: 5,
  freeDailyCreationLimit: 2,
  minDurationMonths: 1,
  maxDurationMonths: 24,
  presenceRequiresPremium: true,
  planById(id: string | null | undefined): PlanDef | undefined {
    return this.catalog.find((p) => p.id === id);
  },
  /** Backend only: replaces the catalog with the admin's plans. The free plan always exists. */
  applyCatalog(plans: PlanDef[]) {
    const next = plans.filter((p) => p && typeof p.id === "string" && p.id.length > 0).map((p) => ({ ...p, features: p.features.filter((f) => FEATURE_IDS.includes(f)) }));
    if (!next.some((p) => p.id === "free")) next.unshift({ ...DEFAULT_PLANS[0] });
    next.sort((a, b) => a.sort - b.sort);
    this.catalog = next;
    const one = next.find((p) => p.id === "one_page");
    const plus = next.find((p) => p.id === "premium_plus");
    if (one) this.onePagePriceNgn = one.priceMonthlyNgn;
    if (plus) {
      this.premiumPlusPriceNgn = plus.priceMonthlyNgn;
      this.standardPriceNgn = plus.priceMonthlyNgn;
      this.launchPriceNgn = plus.priceMonthlyNgn;
    }
    const free = next.find((p) => p.id === "free");
    if (free) {
      this.freeProductLimit = free.productLimit ?? 1_000_000;
      this.freeDailyCreationLimit = free.dailyCreationLimit ?? 1_000_000;
    }
  },
  /** Backend only: the global numbers the admin can change. */
  applyConfig(c: { trialDays?: number; trialPlanId?: string; registrationPromoPercent?: number; maxDurationMonths?: number }) {
    if (typeof c.trialDays === "number") this.trialDays = c.trialDays;
    if (typeof c.trialPlanId === "string" && c.trialPlanId) this.trialPlanId = c.trialPlanId;
    if (typeof c.registrationPromoPercent === "number") this.registrationPromoPercent = c.registrationPromoPercent;
    if (typeof c.maxDurationMonths === "number") this.maxDurationMonths = c.maxDurationMonths;
  },
  priceFor(planId: string, durationMonths: number, promo = false) {
    const monthly = this.planById(planId)?.priceMonthlyNgn ?? 0;
    return Math.round(monthly * durationMonths * (promo ? 1 - this.registrationPromoPercent / 100 : 1) * 100) / 100;
  },
  resolve(
    b: { plan: PlanTier; websitePlan?: string | null; trialEndsAt: Date | string | null; planRenewsAt: Date | string | null; premiumTrialUsed?: boolean; extraFeatures?: string[] },
    now: Date = new Date(),
  ) {
    const t = b.trialEndsAt ? new Date(b.trialEndsAt) : null;
    const r = b.planRenewsAt ? new Date(b.planRenewsAt) : null;
    const paid = b.plan === "premium" && r !== null && r > now;
    const trial = !paid && t !== null && t > now;
    const free = this.planById("free") ?? DEFAULT_PLANS[0];
    const paidDef = this.planById(b.websitePlan ?? "") ?? this.planById("one_page") ?? free;
    const def: PlanDef = paid ? paidDef : trial ? (this.planById(this.trialPlanId) ?? this.planById("premium_plus") ?? paidDef) : free;
    const extra = b.extraFeatures ?? [];
    const has = (f: FeatureId) => def.features.includes(f) || extra.includes(f);
    const premiumPlus = has("multi_page");
    const left = trial && t ? t.getTime() - now.getTime() : 0;
    const websitePlan: string = paid ? paidDef.id : b.websitePlan === "premium_plus" ? "premium_plus" : "one_page";
    return {
      planId: def.id,
      planName: def.name,
      features: [...new Set<string>([...def.features, ...extra])],
      isPremium: paid || trial,
      isPremiumPlus: premiumPlus,
      websitePlan,
      source: paid ? ("paid" as const) : trial ? ("trial" as const) : ("free" as const),
      trialDaysLeft: Math.max(0, Math.ceil(left / 86400000)),
      trialEndsAt: t,
      renewsAt: r,
      trialUsed: Boolean(b.premiumTrialUsed),
      productLimit: def.productLimit,
      dailyCreationLimit: def.dailyCreationLimit,
      canUseReports: has("reports"),
      canCreateCollection: has("collections"),
      canUseProductLinks: has("product_links"),
      canUseTrackingLinks: has("tracking_links"),
      // Custom domains are a paid-only entitlement; trials and expired plans do not qualify.
      canUseCustomDomain: paid,
      canEditPresence: !this.presenceRequiresPremium || has("presence_edit"),
      canUseMultiPage: premiumPlus,
      canUseGalleries: has("galleries"),
      canUseBlog: has("blog"),
      canUseServices: has("services"),
      canUseEvents: has("events"),
      canUseForms: has("forms"),
      canUseAdvancedMedia: has("advanced_media"),
      lapsed: b.plan === "premium" && r !== null && r <= now,
    };
  },
};

