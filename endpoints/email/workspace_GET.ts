import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { loadCustomers, loadEventPeople } from "../../helpers/emailAudience";
import { AUTOMATIONS, type AutomationTrigger } from "../../helpers/emailAutomations";
import { inboxAddressFor } from "../../helpers/emailConfig";
import type { OutputType } from "./workspace_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    const id = business.id;

    const [drafts, templates, automationRows, contactRows, inbox, unread, customers, events] = await Promise.all([
      db.selectFrom("emailDrafts").selectAll().where("businessId", "=", id).orderBy("updatedAt", "desc").limit(50).execute(),
      db.selectFrom("emailTemplates").selectAll().where("businessId", "=", id).orderBy("updatedAt", "desc").limit(50).execute(),
      db.selectFrom("emailAutomations").selectAll().where("businessId", "=", id).execute(),
      db.selectFrom("emailContacts").selectAll().where("businessId", "=", id).where("source", "in", ["manual", "import"]).orderBy("createdAt", "desc").limit(1000).execute(),
      db.selectFrom("emailInbox").selectAll().where("businessId", "=", id).orderBy("receivedAt", "desc").limit(100).execute(),
      db.selectFrom("emailInbox").select((eb) => eb.fn.countAll<string>().as("n")).where("businessId", "=", id).where("isRead", "=", false).executeTakeFirst(),
      loadCustomers(id),
      db.selectFrom("events").select(["id", "title"]).where("businessId", "=", id).orderBy("startsAt", "desc").limit(30).execute(),
    ]);

    const participants: OutputType["people"]["participants"] = [];
    const seen = new Set<string>();
    for (const event of events) {
      const loaded = await loadEventPeople(id, event.id);
      for (const p of loaded.people) {
        const key = `${event.id}:${p.email}`;
        if (seen.has(key)) continue;
        seen.add(key);
        participants.push({ email: p.email, name: p.name, event: event.title, status: p.status ?? "new" });
        if (participants.length >= 1000) break;
      }
      if (participants.length >= 1000) break;
    }

    const byTrigger = new Map(automationRows.map((r) => [r.trigger, r]));
    const output: OutputType = {
      drafts: drafts.map((d) => ({ id: d.id, subject: d.subject, message: d.message, recipients: d.recipients, look: d.look, updatedAt: d.updatedAt })),
      templates: templates.map((t) => ({ id: t.id, name: t.name, subject: t.subject, message: t.message, look: t.look, updatedAt: t.updatedAt })),
      automations: AUTOMATIONS.map((def) => {
        const row = byTrigger.get(def.trigger);
        return { trigger: def.trigger as AutomationTrigger, enabled: row?.enabled ?? false, subject: row?.subject || def.subject, message: row?.message || def.message };
      }),
      contacts: contactRows.map((c) => ({
        id: c.id,
        email: c.email,
        name: c.name,
        phone: c.phone,
        note: c.note,
        source: c.source,
        unsubscribed: Boolean(c.unsubscribedAt),
        bounced: Boolean(c.bouncedAt),
      })),
      people: { customers, participants },
      inbox: inbox.map((m) => ({ id: m.id, fromEmail: m.fromEmail, fromName: m.fromName, subject: m.subject, body: m.body, isRead: m.isRead, receivedAt: m.receivedAt })),
      unread: Number(unread?.n ?? 0),
      inboxAddress: await inboxAddressFor(business.slug),
    };
    return new Response(superjson.stringify(output), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
    return new Response(
      superjson.stringify({ error: noBusiness ? "Create your business page first." : "Not authenticated" }),
      { status: noBusiness ? 400 : 401 },
    );
  }
}
