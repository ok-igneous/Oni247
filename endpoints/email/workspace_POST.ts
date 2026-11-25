import superjson from "superjson";
import { nanoid } from "nanoid";
import { db } from "../../helpers/db";
import type { Json } from "../../helpers/schema";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { schema, type OutputType } from "./workspace_POST.schema";

const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handle(request: Request) {
  let business;
  try {
    business = (await requireOwnedBusiness(request)).business;
  } catch {
    return fail("Not authenticated", 401);
  }
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const businessId = business.id;
    const ok = (extra: Partial<OutputType> = {}) =>
      new Response(superjson.stringify({ ok: true, ...extra } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
    // Reading and tidying is free; writing needs Premium Plus like the rest of Email.
    const writes = !["inbox.read", "inbox.delete", "draft.delete", "template.delete", "contact.delete"].includes(input.op);
    if (writes && !subscriptionPlan.resolve(business).isPremiumPlus) return fail("The Email engine is included in Premium Plus.", 403);

    switch (input.op) {
      case "draft.save": {
        const values = {
          subject: input.subject,
          message: input.message,
          recipients: input.recipients as Json,
          look: (input.look ?? null) as Json | null,
          updatedAt: new Date(),
        };
        if (input.id) {
          const res = await db.updateTable("emailDrafts").set(values).where("id", "=", input.id).where("businessId", "=", businessId).executeTakeFirst();
          if (Number(res.numUpdatedRows) === 0) return fail("That draft no longer exists.", 404);
          return ok({ id: input.id });
        }
        const count = await db.selectFrom("emailDrafts").select((eb) => eb.fn.countAll<string>().as("n")).where("businessId", "=", businessId).executeTakeFirst();
        if (Number(count?.n ?? 0) >= 50) return fail("You have 50 drafts. Delete some to save more.", 400);
        const row = await db.insertInto("emailDrafts").values({ ...values, businessId }).returning("id").executeTakeFirstOrThrow();
        return ok({ id: row.id });
      }
      case "draft.delete":
        await db.deleteFrom("emailDrafts").where("id", "=", input.id).where("businessId", "=", businessId).execute();
        return ok();
      case "template.save": {
        const values = { name: input.name, subject: input.subject, message: input.message, look: (input.look ?? null) as Json | null, updatedAt: new Date() };
        if (input.id) {
          const res = await db.updateTable("emailTemplates").set(values).where("id", "=", input.id).where("businessId", "=", businessId).executeTakeFirst();
          if (Number(res.numUpdatedRows) === 0) return fail("That template no longer exists.", 404);
          return ok({ id: input.id });
        }
        const count = await db.selectFrom("emailTemplates").select((eb) => eb.fn.countAll<string>().as("n")).where("businessId", "=", businessId).executeTakeFirst();
        if (Number(count?.n ?? 0) >= 50) return fail("You have 50 templates. Delete some to save more.", 400);
        const row = await db.insertInto("emailTemplates").values({ ...values, businessId }).returning("id").executeTakeFirstOrThrow();
        return ok({ id: row.id });
      }
      case "template.delete":
        await db.deleteFrom("emailTemplates").where("id", "=", input.id).where("businessId", "=", businessId).execute();
        return ok();
      case "automation.save":
        await db
          .insertInto("emailAutomations")
          .values({ businessId, trigger: input.trigger, enabled: input.enabled, subject: input.subject, message: input.message })
          .onConflict((oc) => oc.columns(["businessId", "trigger"]).doUpdateSet({ enabled: input.enabled, subject: input.subject, message: input.message, updatedAt: new Date() }))
          .execute();
        return ok();
      case "contact.save": {
        const fields = { name: input.name, phone: input.phone || null, note: input.note || null, source: "manual" };
        await db
          .insertInto("emailContacts")
          .values({ businessId, email: input.email, token: nanoid(32), ...fields })
          .onConflict((oc) => oc.columns(["businessId", "email"]).doUpdateSet(fields))
          .execute();
        return ok();
      }
      case "contact.delete":
        await db.deleteFrom("emailContacts").where("id", "=", input.id).where("businessId", "=", businessId).where("source", "in", ["manual", "import"]).execute();
        return ok();
      case "contact.import": {
        const found = new Map<string, string>();
        for (const line of input.text.split(/\r?\n/)) {
          const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^"|"$/g, ""));
          const email = parts.find((p) => EMAIL_RE.test(p))?.toLowerCase();
          if (!email) continue;
          const name = parts.find((p) => p && p.toLowerCase() !== email && !EMAIL_RE.test(p)) ?? "";
          if (!found.has(email)) found.set(email, name.slice(0, 120));
          if (found.size >= 500) break;
        }
        if (found.size === 0) return fail("No email addresses found. Put one person per line, like: Ada Obi, ada@example.com", 400);
        for (const [email, name] of found) {
          await db
            .insertInto("emailContacts")
            .values({ businessId, email, name, token: nanoid(32), source: "import" })
            .onConflict((oc) => oc.columns(["businessId", "email"]).doUpdateSet((eb) => ({ name: name || eb.ref("emailContacts.name") })))
            .execute();
        }
        return ok({ imported: found.size });
      }
      case "inbox.read":
        await db.updateTable("emailInbox").set({ isRead: input.read }).where("id", "=", input.id).where("businessId", "=", businessId).execute();
        return ok();
      case "inbox.delete":
        await db.deleteFrom("emailInbox").where("id", "=", input.id).where("businessId", "=", businessId).execute();
        return ok();
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not save that.", 400);
  }
}
