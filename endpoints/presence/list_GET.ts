import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import type { OutputType } from "./list_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);

    const [testimonials, portfolio] = await Promise.all([
      db
        .selectFrom("testimonials")
        .selectAll()
        .where("businessId", "=", business.id)
        .orderBy("sortOrder", "asc")
        .orderBy("createdAt", "asc")
        .execute(),
      db
        .selectFrom("portfolioItems")
        .selectAll()
        .where("businessId", "=", business.id)
        .orderBy("sortOrder", "asc")
        .orderBy("createdAt", "asc")
        .execute(),
    ]);

    return new Response(
      superjson.stringify({
        testimonials,
        portfolio,
        canEdit: subscriptionPlan.resolve(business).canEditPresence,
      } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
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
