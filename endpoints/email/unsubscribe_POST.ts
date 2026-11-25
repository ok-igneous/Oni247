import superjson from "superjson";
import { db } from "../../helpers/db";

// Public on purpose: mail providers call this for one-click unsubscribe. The
// body is ignored (providers send a form body) and an unknown token is fine.
export async function handle(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  if (token.length >= 16 && token.length <= 64) {
    await db
      .updateTable("emailContacts")
      .set({ unsubscribedAt: new Date() })
      .where("token", "=", token)
      .where("unsubscribedAt", "is", null)
      .execute();
  }
  return new Response(superjson.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
}
