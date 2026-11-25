import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { schema, type OutputType } from "./delete_POST.schema";

export async function handle(request: Request) {
  let businessId: string;
  try {
    const { business } = await requireOwnedBusiness(request);
    if (!subscriptionPlan.resolve(business).canUseEvents) {
      return new Response(superjson.stringify({ error: "The Event Engine is a Premium Plus feature." }), { status: 402 });
    }
    businessId = business.id;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), { status: 401 });
  }

  try {
    const { id } = schema.parse(superjson.parse(await request.text()));
    const found = await db.transaction().execute(async (trx) => {
      const event = await trx
        .selectFrom("events")
        .select("id")
        .where("id", "=", id)
        .where("businessId", "=", businessId)
        .executeTakeFirst();
      if (!event) return false;

      // Registrations, comments and reactions belong to the event and go with it.
      const comments = await trx
        .selectFrom("comments")
        .select("id")
        .where("businessId", "=", businessId)
        .where("targetType", "=", "event")
        .where("targetId", "=", id)
        .execute();
      if (comments.length > 0) {
        await trx.deleteFrom("reactions").where("targetType", "=", "comment").where("targetId", "in", comments.map((row) => row.id)).execute();
      }
      await trx.deleteFrom("comments").where("businessId", "=", businessId).where("targetType", "=", "event").where("targetId", "=", id).execute();
      await trx.deleteFrom("reactions").where("businessId", "=", businessId).where("targetType", "=", "event").where("targetId", "=", id).execute();
      await trx.deleteFrom("formSubmissions").where("businessId", "=", businessId).where("eventId", "=", id).execute();
      await trx.deleteFrom("events").where("id", "=", id).where("businessId", "=", businessId).execute();
      return true;
    });
    if (!found) {
      return new Response(superjson.stringify({ error: "Event not found." }), { status: 404 });
    }
    return new Response(superjson.stringify({ deleted: true } satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete the event.";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}
