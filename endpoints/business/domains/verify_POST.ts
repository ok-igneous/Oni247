import { resolveTxt } from "node:dns/promises";
import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../../helpers/db";
import { getServerUserSession } from "../../../helpers/getServerUserSession";
import { syncRenderCustomDomain } from "../../../helpers/renderCustomDomains";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const body = await request.json() as { domainId?: unknown };
    if (typeof body.domainId !== "string" || !body.domainId) {
      return new Response(superjson.stringify({ error: "A domain ID is required." }), { status: 400 });
    }
    const rows = await sql<{
      id: string; hostname: string; verification_token: string | null;
      status: string; render_custom_domain_id: string | null;
    }>`select d.id, d.hostname, d.verification_token, d.status, d.render_custom_domain_id
        from business_domains d
        join businesses b on b.id = d.business_id
       where d.id = ${body.domainId} and b.owner_id = ${user.id}
         and d.domain_type = 'customer_domain' and d.status in ('pending','verified')
       limit 1`.execute(db);
    const domain = rows.rows[0];
    if (!domain) {
      return new Response(superjson.stringify({ error: "Pending or verified domain not found." }), { status: 404 });
    }

    if (domain.status === "pending") {
      if (!domain.verification_token) {
        return new Response(superjson.stringify({ error: "The ownership verification token is missing. Contact support." }), { status: 409 });
      }
      const recordName = `_oni247-verification.${domain.hostname}`;
      let values: string[] = [];
      try { values = (await resolveTxt(recordName)).map((parts) => parts.join("")); } catch { /* DNS may not have propagated yet. */ }
      const expected = `oni247-verification=${domain.verification_token}`;
      if (!values.includes(expected)) {
        return new Response(superjson.stringify({
          verified: false,
          error: "Verification TXT record was not found yet. Check the record name and value, then retry after DNS propagation.",
        }), { status: 409 });
      }
      await sql`update business_domains
        set status = 'verified', verified_at = now(), verification_token = null,
            last_checked_at = now(), updated_at = now()
        where id = ${domain.id}`.execute(db);
    }

    const render = await syncRenderCustomDomain(domain.hostname, domain.render_custom_domain_id);
    const nextStatus = render.tlsReady ? "active" : "verified";
    const nextSslStatus = render.tlsReady ? "active" : "pending";
    await sql`update business_domains
      set render_custom_domain_id = coalesce(${render.domainId ?? null}, render_custom_domain_id),
          render_verification_status = ${render.verificationStatus},
          status = ${nextStatus},
          ssl_status = ${nextSslStatus},
          last_checked_at = now(),
          last_error = ${render.verificationStatus === "error" ? render.message : null},
          updated_at = now()
      where id = ${domain.id}`.execute(db);

    return new Response(superjson.stringify({
      verified: true,
      hostname: domain.hostname,
      status: nextStatus,
      sslStatus: nextSslStatus,
      renderVerificationStatus: render.verificationStatus,
      message: render.message,
    }), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify this domain.";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}
