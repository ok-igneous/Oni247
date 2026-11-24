import { db } from "./db";

/** One received email, in the app's own neutral shape (any mail forwarder can be mapped to it). */
export type InboundEmail = {
  from: string;
  recipients: string[];
  subject?: string | null;
  text?: string | null;
  html?: string | null;
  messageId?: string | null;
};

const addressOf = (v: unknown): { email: string; name: string } => {
  const text = typeof v === "string" ? v : "";
  const m = text.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim().slice(0, 120), email: m[2].trim().toLowerCase() };
  return { name: "", email: text.trim().toLowerCase() };
};

const plain = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/[ \t]+/g, " ").trim();

/** Files a reply into the right shop's Inbox, by the shop address it was sent to (<shop-slug>@your-mail-domain). */
export async function handleInboundEmail(email: InboundEmail) {
  const from = addressOf(email.from);
  if (!from.email) return 0;
  const recipients = Array.isArray(email.recipients) ? email.recipients.slice(0, 20) : [];
  const body = (email.text && email.text.trim() ? email.text : email.html ? plain(email.html) : "").slice(0, 20000);
  let filed = 0;
  for (const recipient of recipients) {
    const slug = addressOf(String(recipient)).email.split("@")[0]?.toLowerCase();
    if (!slug) continue;
    const business = await db.selectFrom("businesses").select("id").where("slug", "=", slug).executeTakeFirst();
    if (!business) continue;
    await db
      .insertInto("emailInbox")
      .values({
        businessId: business.id,
        messageId: email.messageId ?? null,
        fromEmail: from.email.slice(0, 200),
        fromName: from.name,
        subject: (email.subject ?? "").slice(0, 300),
        body,
      })
      .onConflict((oc) => oc.columns(["businessId", "messageId"]).doNothing())
      .execute();
    filed += 1;
  }
  return filed;
}

