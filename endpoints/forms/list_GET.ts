import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    const allowed = subscriptionPlan.resolve(business).canUseForms;
    if (!allowed) return new Response(superjson.stringify({ error: "Forms are available on Premium Plus only." }), { status: 402 });
    const forms = await db.selectFrom("forms").selectAll().where("businessId", "=", business.id).orderBy("updatedAt", "desc").execute();
    return new Response(superjson.stringify({ forms, canUseForms: allowed }), { headers: { "Content-Type": "application/json" } });
  } catch { return new Response(superjson.stringify({ error: "Not authenticated" }), { status: 401 }); }
}
