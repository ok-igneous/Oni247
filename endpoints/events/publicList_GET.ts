import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

export async function handle(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("slug") ?? "";
    const business = await db
      .selectFrom("businesses")
      .select(["id", "slug", "status", "plan", "websitePlan", "trialEndsAt", "planRenewsAt"])
      .where("slug", "=", slug)
      .where("status", "=", "published")
      .executeTakeFirst();
    if (!business || !subscriptionPlan.resolve(business).canUseEvents) {
      return new Response(superjson.stringify({ error: "Events not found." }), { status: 404 });
    }
    const rows = await db
      .selectFrom("events")
      .select([
        "id", "title", "slug", "description", "coverImageUrl", "startsAt", "endsAt", "venue",
        "registrationEnabled", "registrationClosesAt", "capacity",
      ])
      .where("businessId", "=", business.id)
      .where("published", "=", true)
      .orderBy("startsAt", "asc")
      .limit(200)
      .execute();

    const counts = new Map<string, number>();
    if (rows.length > 0) {
      const grouped = await db
        .selectFrom("formSubmissions")
        .select(["eventId", sql<string>`count(*)`.as("total")])
        .where("eventId", "in", rows.map((row) => row.id))
        .groupBy("eventId")
        .execute();
      grouped.forEach((row) => row.eventId && counts.set(row.eventId, Number(row.total)));
    }

    const events = rows.map((row) => ({ ...row, registrationCount: counts.get(row.id) ?? 0 }));
    return new Response(superjson.stringify({ events }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return new Response(superjson.stringify({ error: "Could not load events." }), { status: 400 });
  }
}
