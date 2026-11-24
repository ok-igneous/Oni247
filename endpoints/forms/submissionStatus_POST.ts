import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { schema } from "./submissionStatus_POST.schema";

/** The owner approves or declines a registration. Only their own business's submissions can change. */
export async function handle(request: Request) {
  let businessId: string;
  try {
    const { business } = await requireOwnedBusiness(request);
    if (!subscriptionPlan.resolve(business).canUseForms) {
      return new Response(superjson.stringify({ error: "Registrations are available on Premium Plus only." }), { status: 402 });
    }
    businessId = business.id;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), { status: 401 });
  }

  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const row = await db
      .updateTable("formSubmissions")
      .set({ status: input.status })
      .where("id", "=", input.id)
      .where("businessId", "=", businessId)
      .returning(["id"])
      .executeTakeFirst();
    if (!row) return new Response(superjson.stringify({ error: "Registration not found." }), { status: 404 });
    return new Response(superjson.stringify({ saved: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(superjson.stringify({ error: error instanceof Error ? error.message : "Could not update the registration." }), { status: 400 });
  }
}

