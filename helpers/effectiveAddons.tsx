import { ADDONS, type AddonDef, type AddonId } from "./addons";
import { platformSettings } from "./platformSettings";
import { loadPlanConfig } from "./planConfig";
import { subscriptionPlan } from "./subscriptionPlan";
import { db } from "./db";

export type AddonOverride = {
  name?: string;
  description?: string;
  freeForAll?: boolean;
  /** What a shop pays per month for this add-on when its plan does not include it. 0 or empty: not sold separately. */
  priceMonthlyNgn?: number;
  comingSoon?: boolean;
  hidden?: boolean;
  /** Older saves used these. */
  access?: "free" | "premium_plus";
};
export const ADDONS_KEY = "addons";

export type EffectiveAddon = AddonDef & { hidden: boolean; freeForAll: boolean; priceMonthlyNgn: number; includedPlanIds: string[] };

/** Backend only. The built-in add-ons with the Oni247 admin's changes applied: text, free for everyone, which plans include it, price. */
export const effectiveAddons = async (): Promise<EffectiveAddon[]> => {
  await loadPlanConfig();
  const saved = (await platformSettings.get<Record<string, AddonOverride>>(ADDONS_KEY)) ?? {};
  return ADDONS.map((addon) => {
    const o = saved[addon.id] ?? {};
    const freeForAll = typeof o.freeForAll === "boolean" ? o.freeForAll : o.access ? o.access === "free" : Boolean(addon.defaultFree) || addon.feature === null;
    const includedPlanIds = addon.feature ? subscriptionPlan.catalog.filter((p) => p.features.includes(addon.feature as never)).map((p) => p.id) : [];
    return {
      ...addon,
      name: o.name?.trim() || addon.name,
      description: o.description?.trim() || addon.description,
      access: freeForAll ? "free" : "premium_plus",
      comingSoon: typeof o.comingSoon === "boolean" ? o.comingSoon : addon.comingSoon,
      hidden: Boolean(o.hidden),
      freeForAll,
      priceMonthlyNgn: Math.max(0, Number(o.priceMonthlyNgn) || 0),
      includedPlanIds,
    };
  });
};

/** Backend only. Whether this shop may switch the add-on on, and why. */
export const addonEntitlement = async (
  addon: EffectiveAddon,
  businessId: string,
  features: readonly string[],
): Promise<{ entitled: boolean; via: "free" | "plan" | "purchase" | null; expiresAt: Date | null }> => {
  if (addon.freeForAll) return { entitled: true, via: "free", expiresAt: null };
  if (addon.feature && features.includes(addon.feature)) return { entitled: true, via: "plan", expiresAt: null };
  const row = await db.selectFrom("addonPurchases").select("expiresAt").where("businessId", "=", businessId).where("addonId", "=", addon.id as AddonId).executeTakeFirst();
  if (row && new Date(row.expiresAt) > new Date()) return { entitled: true, via: "purchase", expiresAt: new Date(row.expiresAt) };
  return { entitled: false, via: null, expiresAt: row ? new Date(row.expiresAt) : null };
};

