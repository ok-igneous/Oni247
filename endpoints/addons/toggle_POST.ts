import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { addonEntitlement, effectiveAddons } from "../../helpers/effectiveAddons";
import type { Json } from "../../helpers/schema";
import { schema, type OutputType } from "./toggle_POST.schema";

const fail = (error: string, status: number) =>
  new Response(superjson.stringify({ error }), { status });

export async function handle(request: Request) {
  let business;
  try {
    business = (await requireOwnedBusiness(request)).business;
  } catch {
    return fail("Not authenticated", 401);
  }
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const addon = (await effectiveAddons()).find((a) => a.id === input.id && !a.hidden);
    if (!addon) return fail("Unknown add-on.", 400);

    if (input.enabled) {
      if (addon.comingSoon) return fail(`${addon.name} is coming soon.`, 400);
      const plan = subscriptionPlan.resolve(business);
      const ent = await addonEntitlement(addon, business.id, plan.features);
      if (!ent.entitled) {
        return fail(addon.priceMonthlyNgn > 0 ? `${addon.name} is not on your plan. You can add it for ₦${addon.priceMonthlyNgn.toLocaleString("en-NG")} a month.` : `${addon.name} is not included in your plan.`, 403);
      }
    }

    const appearance = (business.appearanceSettings ?? {}) as Record<string, unknown>;
    const current =
      appearance.addons && typeof appearance.addons === "object" && !Array.isArray(appearance.addons)
        ? (appearance.addons as Record<string, unknown>)
        : {};
    const next = { ...appearance, addons: { ...current, [input.id]: input.enabled } };

    await db
      .updateTable("businesses")
      .set({ appearanceSettings: next as unknown as Json, updatedAt: new Date() })
      .where("id", "=", business.id)
      .execute();

    return new Response(superjson.stringify({ id: input.id, enabled: input.enabled } satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not update the add-on.", 400);
  }
}