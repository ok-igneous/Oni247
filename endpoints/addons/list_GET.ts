import superjson from "superjson";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { isAddonEnabled } from "../../helpers/addons";
import { addonEntitlement, effectiveAddons } from "../../helpers/effectiveAddons";
import { flutterwaveEnv } from "../../helpers/flutterwaveEnv";
import type { OutputType } from "./list_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    const plan = subscriptionPlan.resolve(business);
    const appearance = (business.appearanceSettings ?? {}) as Record<string, unknown>;
    const visible = (await effectiveAddons()).filter((addon) => !addon.hidden);
    const items: OutputType["items"] = [];
    for (const addon of visible) {
      const ent = await addonEntitlement(addon, business.id, plan.features);
      items.push({
        id: addon.id,
        name: addon.name,
        description: addon.description,
        access: addon.access,
        comingSoon: Boolean(addon.comingSoon),
        enabled: isAddonEnabled(appearance, addon.id),
        entitled: ent.entitled,
        via: ent.via,
        includedIn: addon.includedPlanIds.map((id) => subscriptionPlan.planById(id)?.name ?? id),
        priceMonthlyNgn: addon.priceMonthlyNgn,
        expiresAt: ent.expiresAt,
      });
    }
    const output: OutputType = {
      isPremiumPlus: plan.isPremiumPlus,
      items,
      paymentsConfigured: Boolean((await flutterwaveEnv()).secretKey),
      maxDurationMonths: subscriptionPlan.maxDurationMonths,
    };
    return new Response(superjson.stringify(output), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
    return new Response(
      superjson.stringify({ error: noBusiness ? "Create your business page first." : "Not authenticated" }),
      { status: noBusiness ? 400 : 401 },
    );
  }
}
