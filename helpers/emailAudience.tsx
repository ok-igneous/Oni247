import { db } from "./db";

export type AudienceInput =
  | { kind: "customers" }
  | { kind: "event"; eventId: string; approvedOnly: boolean };

export type Person = { email: string; name: string; status?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const dedupe = (people: Person[]): Person[] => {
  const seen = new Set<string>();
  const out: Person[] = [];
  for (const p of people) {
    const email = p.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    out.push({ ...p, email });
  }
  return out;
};

/** Removes people who unsubscribed or whose address hard-bounced. */
export const dropOptedOut = async (businessId: string, people: Person[]) => {
  if (people.length === 0) return { people, excluded: 0 };
  const rows = await db
    .selectFrom("emailContacts")
    .select("email")
    .where("businessId", "=", businessId)
    .where("email", "in", people.map((p) => p.email))
    .where((eb) => eb.or([eb("unsubscribedAt", "is not", null), eb("bouncedAt", "is not", null)]))
    .execute();
  const blocked = new Set(rows.map((r) => r.email));
  const kept = people.filter((p) => !blocked.has(p.email));
  return { people: kept, excluded: people.length - kept.length };
};

/** Everyone who registered for an event (declined registrations left out), with their status. */
export const loadEventPeople = async (businessId: string, eventId: string) => {
  const event = await db
    .selectFrom("events")
    .select(["id", "title", "formId"])
    .where("id", "=", eventId)
    .where("businessId", "=", businessId)
    .executeTakeFirst();
  if (!event) throw new Error("Event not found.");
  if (!event.formId) return { label: event.title, people: [] as Person[] };
  const form = await db
    .selectFrom("forms")
    .select("fields")
    .where("id", "=", event.formId)
    .where("businessId", "=", businessId)
    .executeTakeFirst();
  const fields = Array.isArray(form?.fields) ? (form.fields as Array<{ id: string; label: string; type: string }>) : [];
  const emailIds = fields.filter((f) => f.type === "email").map((f) => f.id);
  const nameField = fields.find((f) => f.type === "text" && /name/i.test(f.label)) ?? fields.find((f) => f.type === "text");
  if (emailIds.length === 0) return { label: event.title, people: [] as Person[] };
  const rows = await db
    .selectFrom("formSubmissions")
    .select(["answers", "status"])
    .where("businessId", "=", businessId)
    .where("eventId", "=", eventId)
    .where("status", "!=", "declined")
    .execute();
  const people: Person[] = [];
  for (const row of rows) {
    const answers = (row.answers ?? {}) as Record<string, unknown>;
    const email = emailIds.map((id) => answers[id]).find((v): v is string => typeof v === "string" && v.trim() !== "");
    if (!email) continue;
    const name = nameField && typeof answers[nameField.id] === "string" ? String(answers[nameField.id]).trim() : "";
    people.push({ email, name, status: row.status });
  }
  return { label: event.title, people: dedupe(people) };
};

export const loadCustomers = async (businessId: string): Promise<Person[]> => {
  const rows = await db
    .selectFrom("customers")
    .select(["name", "email"])
    .where("businessId", "=", businessId)
    .where("email", "is not", null)
    .limit(5000)
    .execute();
  return dedupe(rows.filter((r) => r.email).map((r) => ({ email: r.email as string, name: r.name })));
};

export const loadAudience = async (businessId: string, audience: AudienceInput) => {
  if (audience.kind === "customers") {
    const people = await loadCustomers(businessId);
    const kept = await dropOptedOut(businessId, people);
    return { label: "Customers with an email address", ...kept };
  }
  const event = await loadEventPeople(businessId, audience.eventId);
  const chosen = audience.approvedOnly ? event.people.filter((p) => p.status === "approved") : event.people;
  const kept = await dropOptedOut(businessId, chosen);
  return { label: `${event.label} — ${audience.approvedOnly ? "approved registrants" : "registrants"}`, ...kept };
};
