import superjson from "superjson";
import { z } from "zod";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { toSlug } from "../../helpers/toSlug";

const mediaUrl = z.string().trim().max(1000).refine(value => {
  if (value.startsWith("/_cdn/")) return true;
  try { const parsed = new URL(value); return parsed.protocol === "https:" || parsed.protocol === "http:"; }
  catch { return false; }
}, "Use a valid image URL or upload an image.");
const inputSchema = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(2).max(140), slug: z.string().trim().min(2).max(160).optional(), description: z.string().max(10000), coverImageUrl: z.preprocess(value => typeof value === "string" ? value.trim() || null : value, mediaUrl.nullable().optional()), startsAt: z.string().datetime(), endsAt: z.string().datetime().nullable().optional(), venue: z.string().max(300).nullable().optional(), registrationEnabled: z.boolean(), approvalRequired: z.boolean().optional(), registrationClosesAt: z.string().datetime().nullable().optional(), capacity: z.number().int().min(1).max(100000).nullable().optional(), formId: z.string().uuid().nullable().optional(), published: z.boolean() });

export async function handle(request: Request) {
  let business;
  try { business = (await requireOwnedBusiness(request)).business; } catch { return new Response(superjson.stringify({ error: "Not authenticated" }), { status: 401 }); }
  if (!subscriptionPlan.resolve(business).canUseEvents) return new Response(superjson.stringify({ error: "The Event Engine is a Premium Plus feature." }), { status: 402 });
  try {
    const input = inputSchema.parse(superjson.parse(await request.text()));
    const slug = toSlug(input.slug || input.title);
    if (!slug) return new Response(superjson.stringify({ error: "Enter an event title that can be used to create a URL." }), { status: 400 });
    let duplicateQuery = db.selectFrom("events").select("id").where("businessId", "=", business.id).where("slug", "=", slug);
    if (input.id) duplicateQuery = duplicateQuery.where("id", "!=", input.id);
    const duplicate = await duplicateQuery.executeTakeFirst();
    if (duplicate) return new Response(superjson.stringify({ error: "This event URL slug is already in use. Choose a different slug." }), { status: 409 });
    if (input.registrationEnabled && !input.formId) return new Response(superjson.stringify({ error: "Choose a registration form or turn off attendee registration." }), { status: 400 });
    if (input.endsAt && new Date(input.endsAt) < new Date(input.startsAt)) return new Response(superjson.stringify({ error: "The event end time must be after its start time." }), { status: 400 });
    if (input.registrationClosesAt && new Date(input.registrationClosesAt) > new Date(input.startsAt)) return new Response(superjson.stringify({ error: "Registration must close before the event starts." }), { status: 400 });
    if (input.formId) {
      const form = await db.selectFrom("forms").select("id").where("id", "=", input.formId).where("businessId", "=", business.id).where("isActive", "=", true).executeTakeFirst();
      if (!form) return new Response(superjson.stringify({ error: "Choose an active form belonging to your business." }), { status: 400 });
    }
    const values = { title: input.title, slug, description: input.description, coverImageUrl: input.coverImageUrl ?? null, startsAt: new Date(input.startsAt), endsAt: input.endsAt ? new Date(input.endsAt) : null, venue: input.venue ?? null, registrationEnabled: input.registrationEnabled, ...(input.approvalRequired !== undefined ? { approvalRequired: input.approvalRequired } : {}), registrationClosesAt: input.registrationClosesAt ? new Date(input.registrationClosesAt) : null, capacity: input.capacity ?? null, formId: input.formId ?? null, published: input.published, updatedAt: new Date() };
    if (input.id) {
      const updated = await db.updateTable("events").set(values).where("id", "=", input.id).where("businessId", "=", business.id).returning("id").executeTakeFirst();
      if (!updated) return new Response(superjson.stringify({ error: "Event not found." }), { status: 404 });
    } else await db.insertInto("events").values({ ...values, businessId: business.id }).execute();
    return new Response(superjson.stringify({ saved: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error) { return new Response(superjson.stringify({ error: error instanceof Error ? error.message : "Could not save event." }), { status: 400 }); }
}
