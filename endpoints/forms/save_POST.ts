import superjson from "superjson";
import { z } from "zod";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

const field = z.object({ id: z.string().min(1).max(60), label: z.string().trim().min(1).max(100), type: z.enum(["text", "textarea", "email", "phone", "number", "date", "select", "checkbox"]), required: z.boolean().default(false), options: z.array(z.string().trim().min(1).max(80)).max(30).optional() });
const inputSchema = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(2).max(120), description: z.string().max(1000).optional().nullable(), fields: z.array(field).min(1).max(30), submitLabel: z.string().trim().min(1).max(40), successMessage: z.string().trim().min(1).max(300), isActive: z.boolean() });

export async function handle(request: Request) {
  let business;
  try { business = (await requireOwnedBusiness(request)).business; } catch { return new Response(superjson.stringify({ error: "Not authenticated" }), { status: 401 }); }
  if (!subscriptionPlan.resolve(business).canUseForms) return new Response(superjson.stringify({ error: "The Form Engine is a Premium Plus feature." }), { status: 402 });
  try {
    const input = inputSchema.parse(superjson.parse(await request.text()));
    const values = { title: input.title, description: input.description ?? null, fields: input.fields, submitLabel: input.submitLabel, successMessage: input.successMessage, isActive: input.isActive, updatedAt: new Date() };
    if (input.id) {
      const updated = await db.updateTable("forms").set(values).where("id", "=", input.id).where("businessId", "=", business.id).returning("id").executeTakeFirst();
      if (!updated) return new Response(superjson.stringify({ error: "Form not found." }), { status: 404 });
    } else await db.insertInto("forms").values({ ...values, businessId: business.id }).execute();
    return new Response(superjson.stringify({ saved: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error) { return new Response(superjson.stringify({ error: error instanceof Error ? error.message : "Could not save form." }), { status: 400 }); }
}
