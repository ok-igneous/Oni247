import { resolveTxt } from "node:dns/promises";
import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../../helpers/db";
import { getServerUserSession } from "../../../helpers/getServerUserSession";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const body = await request.json() as { domainId?: unknown };
    if (typeof body.domainId !== "string" || !body.domainId) {
      return new Response(superjson.stringify({ error: "A domain ID is required." }), { status: 400 });
    }
    const rows = await sql<{ id: string; hostname: string; verification_token: string | null }>`
      select d.id, d.hostname, d.verification_token
        from business_domains d
        join businesses b on b.id = d.business_id
       where d.id = ${body.domainId} and b.owner_id = ${user.id}
         and d.domain_type = 'customer_domain' and d.status = 'pending'
       limit 1`.execute(db);
    const domain = rows.rows[0];
    if (!domain || !domain.verification_token) {
      return new Response(superjson.stringify({ error: "Pending domain not found." }), { status: 404 });
    }
    const recordName = `_oni247-verification.${domain.hostname}`;
    let values: string[] = [];
    try { values = (await resolveTxt(recordName)).map((parts) => parts.join("")); } catch { /* DNS may not have propagated yet. */ }
    const expected = `oni247-verification=${domain.verification_token}`;
    if (!values.includes(expected)) {
      return new Response(superjson.stringify({ verified: false, error: "Verification TXT record was not found yet. Check the record name and value, then retry after DNS propagation." }), { status: 409 });
    }
    await sql`update business_domains
      set status = 'verified', verified_at = now(), verification_token = null,
          last_checked_at = now(), updated_at = now()
      where id = ${domain.id}`.execute(db);
    return new Response(superjson.stringify({
      verified: true, hostname: domain.hostname, sslStatus: "pending",
      message: "Domain ownership verified. HTTPS is not active until a trusted TLS certificate is provisioned.",
    }), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify this domain.";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}
