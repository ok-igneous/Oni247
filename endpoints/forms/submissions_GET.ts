import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    if (!subscriptionPlan.resolve(business).canUseForms) return new Response(superjson.stringify({ error: "Form responses are available on Premium Plus only." }), { status: 402 });
    const url = new URL(request.url); const formId = url.searchParams.get("formId"); const eventId = url.searchParams.get("eventId");
    let query = db.selectFrom("formSubmissions").selectAll().where("businessId", "=", business.id).orderBy("submittedAt", "desc").limit(500);
    if (formId) query = query.where("formId", "=", formId);
    if (eventId) query = query.where("eventId", "=", eventId);
    const submissions = await query.execute();
    return new Response(superjson.stringify({ submissions }), { headers: { "Content-Type": "application/json" } });
  } catch { return new Response(superjson.stringify({ error: "Not authenticated" }), { status: 401 }); }
}
