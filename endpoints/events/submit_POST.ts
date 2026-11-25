import superjson from "superjson";
import { z } from "zod";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

const schema = z.object({ slug: z.string().min(1).max(120), eventSlug: z.string().min(1).max(160), answers: z.record(z.unknown()) });

export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const business = await db.selectFrom("businesses").select(["id", "plan", "websitePlan", "trialEndsAt", "planRenewsAt", "status"]).where("slug", "=", input.slug).where("status", "=", "published").executeTakeFirst();
    if (!business || !subscriptionPlan.resolve(business).canUseEvents) return new Response(superjson.stringify({ error: "Registration is unavailable." }), { status: 404 });
    const event = await db.selectFrom("events").selectAll().where("businessId", "=", business.id).where("slug", "=", input.eventSlug).where("published", "=", true).executeTakeFirst();
    if (!event || !event.registrationEnabled || !event.formId) return new Response(superjson.stringify({ error: "Registration is closed." }), { status: 400 });
    const now = new Date();
    if ((event.registrationClosesAt && event.registrationClosesAt <= now) || event.startsAt <= now) return new Response(superjson.stringify({ error: "Registration is closed." }), { status: 400 });
    const form = await db.selectFrom("forms").selectAll().where("id", "=", event.formId).where("businessId", "=", business.id).where("isActive", "=", true).executeTakeFirst();
    if (!form) return new Response(superjson.stringify({ error: "Registration form is unavailable." }), { status: 400 });
    const fields = Array.isArray(form.fields) ? form.fields as Array<{id:string;label:string;type:string;required:boolean;options?:string[]}> : [];
    const clean: Record<string, unknown> = {};
    for (const field of fields) {
      const value = input.answers[field.id];
      if (field.type === "checkbox" && value !== undefined && typeof value !== "boolean") return new Response(superjson.stringify({ error: `Choose a valid value for ${field.label}.` }), { status: 400 });
      if (field.required && (value === undefined || value === null || String(value).trim() === "" || value === false)) return new Response(superjson.stringify({ error: `${field.label} is required.` }), { status: 400 });
      if (value !== undefined && value !== null) {
        const text = String(value).trim();
        if (text.length > 2000) return new Response(superjson.stringify({ error: `${field.label} is too long.` }), { status: 400 });
        if (field.type === "email" && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return new Response(superjson.stringify({ error: "Enter a valid email address." }), { status: 400 });
        if (field.type === "select" && field.options && !field.options.includes(text)) return new Response(superjson.stringify({ error: `Choose a valid option for ${field.label}.` }), { status: 400 });
        clean[field.id] = field.type === "checkbox" ? value === true : text;
      }
    }
    await db.transaction().execute(async trx => {
      const locked = await trx.selectFrom("events").selectAll().where("id", "=", event.id).where("businessId", "=", business.id).forUpdate().executeTakeFirst();
      const lockedNow = new Date();
      if (!locked || !locked.published || !locked.registrationEnabled || locked.formId !== form.id || locked.startsAt <= lockedNow || (locked.registrationClosesAt && locked.registrationClosesAt <= lockedNow)) throw new Error("REGISTRATION_CLOSED");
      const current = await sql<{ count: string }>`select app_private.public_event_registration_count(${event.id})::text as count`.execute(trx);
      if (locked.capacity !== null && Number(current.rows[0]?.count ?? 0) >= locked.capacity) throw new Error("CAPACITY_FULL");
      const identityFields = fields.filter(field => field.type === "email" || field.type === "phone");
      for (const field of identityFields) {
        const raw = clean[field.id];
        if (typeof raw !== "string" || !raw.trim()) continue;
        const identity = field.type === "email" ? raw.trim().toLowerCase() : raw.replace(/\D/g, "");
        if (!identity) continue;
        const duplicate = await sql<{ found: boolean }>`select app_private.public_event_has_duplicate(${event.id}, ${field.id}, ${identity}, ${field.type}) as found`.execute(trx);
        if (duplicate.rows[0]?.found) throw new Error("DUPLICATE_REGISTRATION");
      }
      await sql`INSERT INTO form_submissions (business_id, form_id, event_id, answers) VALUES (${business.id}::uuid, ${form.id}::uuid, ${event.id}::uuid, ${clean}::jsonb)`.execute(trx);
    });
    return new Response(superjson.stringify({ submitted: true, message: event.approvalRequired ? `${form.successMessage} The organiser will confirm your registration.` : form.successMessage }), { headers: { "Content-Type": "application/json" } });
  } catch (error) { const message=error instanceof Error?error.message:"Could not submit registration.";return new Response(superjson.stringify({ error: message==="CAPACITY_FULL"?"This event has reached its registration capacity.":message==="REGISTRATION_CLOSED"?"Registration is closed.":message==="DUPLICATE_REGISTRATION"?"A registration with this email address or phone number already exists.":message }), { status: message==="CAPACITY_FULL"?409:message==="DUPLICATE_REGISTRATION"?409:400 }); }
}
