import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    if (!subscriptionPlan.resolve(business).canUseEvents) {
      return new Response(superjson.stringify({ error: "Events are available on Premium Plus only." }), { status: 402 });
    }
    const events = await db
      .selectFrom("events")
      .selectAll()
      .where("businessId", "=", business.id)
      .orderBy("startsAt", "desc")
      .execute();
    const forms = await db
      .selectFrom("forms")
      .select(["id", "title", "isActive", "fields"])
      .where("businessId", "=", business.id)
      .orderBy("title")
      .execute();

    const counts = new Map<string, number>();
    if (events.length > 0) {
      const grouped = await db
        .selectFrom("formSubmissions")
        .select(["eventId", sql<string>`count(*)`.as("total")])
        .where("eventId", "in", events.map((event) => event.id))
        .groupBy("eventId")
        .execute();
      grouped.forEach((row) => row.eventId && counts.set(row.eventId, Number(row.total)));
    }

    return new Response(
      superjson.stringify({
        events: events.map((event) => ({ ...event, registrationCount: counts.get(event.id) ?? 0 })),
        forms,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), { status: 401 });
  }
}
