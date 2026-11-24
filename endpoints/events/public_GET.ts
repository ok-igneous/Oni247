import superjson from "superjson";
import { db } from "../../helpers/db";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

export async function handle(request: Request) {
  try {
    const url = new URL(request.url); const slug = url.searchParams.get("slug") ?? ""; const eventSlug = url.searchParams.get("event") ?? "";
    const business = await db.selectFrom("businesses").select(["id", "slug", "name", "logoUrl", "appearanceSettings", "status", "plan", "websitePlan", "trialEndsAt", "planRenewsAt"]).where("slug", "=", slug).where("status", "=", "published").executeTakeFirst();
    if (!business || !subscriptionPlan.resolve(business).canUseEvents) return new Response(superjson.stringify({ error: "Event not found." }), { status: 404 });
    const event = await db.selectFrom("events").selectAll().where("businessId", "=", business.id).where("slug", "=", eventSlug).where("published", "=", true).executeTakeFirst();
    if (!event) return new Response(superjson.stringify({ error: "Event not found." }), { status: 404 });
    const form = event.formId ? await db.selectFrom("forms").selectAll().where("id", "=", event.formId).where("businessId", "=", business.id).where("isActive", "=", true).executeTakeFirst() : undefined;
    const count = await db.selectFrom("formSubmissions").select(({ fn }) => fn.countAll<number>().as("count")).where("eventId", "=", event.id).executeTakeFirstOrThrow();
    return new Response(superjson.stringify({ business: { slug: business.slug, name: business.name, logoUrl: business.logoUrl, appearanceSettings: business.appearanceSettings }, event, form: form ?? null, registrationCount: Number(count.count) }), { headers: { "Content-Type": "application/json" } });
  } catch { return new Response(superjson.stringify({ error: "Could not load this event." }), { status: 400 }); }
}
