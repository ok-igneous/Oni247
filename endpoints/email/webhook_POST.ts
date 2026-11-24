// floot:external
import superjson from "superjson";
import { nanoid } from "nanoid";
import { db } from "../../helpers/db";
import { parseWebhook, type MailProvider } from "../../helpers/mailProviders";

// Called by each shop's mail provider when an address bounces, complains or
// unsubscribes. The long random token in the URL says which shop it belongs to.
export async function handle(request: Request) {
  const ok = () => new Response(superjson.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  try {
    const token = new URL(request.url).searchParams.get("k") ?? "";
    if (token.length < 16 || token.length > 64) return ok();
    const row = await db.selectFrom("emailSettings").select(["businessId", "provider"]).where("webhookToken", "=", token).executeTakeFirst();
    if (!row) return ok();
    let body: unknown = null;
    try {
      body = JSON.parse(await request.text());
    } catch {
      return ok();
    }
    const signals = parseWebhook(row.provider as MailProvider, body).slice(0, 500);
    const now = new Date();
    for (const s of signals) {
      const flags =
        s.kind === "bounced" ? { bouncedAt: now } : s.kind === "complained" ? { bouncedAt: now, unsubscribedAt: now } : { unsubscribedAt: now };
      await db
        .insertInto("emailContacts")
        .values({ businessId: row.businessId, email: s.email, token: nanoid(32), ...flags })
        .onConflict((oc) => oc.columns(["businessId", "email"]).doUpdateSet(flags))
        .execute();
    }
  } catch (error) {
    console.error("email webhook failed", error instanceof Error ? error.message : error);
  }
  return ok();
}
