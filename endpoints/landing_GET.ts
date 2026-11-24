import superjson from "superjson";
import { platformSettings } from "../helpers/platformSettings";
import { LANDING_KEY, mergeLanding } from "../helpers/landingConfig";
import { loadPlanConfig } from "../helpers/planConfig";
import { subscriptionPlan } from "../helpers/subscriptionPlan";
import { FEATURES } from "../helpers/features";
import type { OutputType } from "./landing_GET.schema";

/** Public. The landing page's saved content and the live plans, so prices on the page are never out of date. */
export async function handle(_request: Request) {
  try {
    await loadPlanConfig();
    const saved = await platformSettings.get<unknown>(LANDING_KEY);
    const output: OutputType = {
      landing: mergeLanding(saved),
      plans: subscriptionPlan.catalog
        .filter((p) => p.active)
        .map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          priceMonthlyNgn: p.priceMonthlyNgn,
          highlighted: p.highlighted,
          productLimit: p.productLimit,
          features: p.features.map((id): string | undefined => FEATURES.find((f) => f.id === id)?.label).filter((x): x is string => Boolean(x)),
        })),
    };
    return new Response(superjson.stringify(output), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" } });
  } catch {
    return new Response(superjson.stringify({ error: "Could not load the page." }), { status: 500 });
  }
}
