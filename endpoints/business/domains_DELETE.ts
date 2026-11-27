import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { hasPaidCustomDomainAccess } from "../../helpers/domainEntitlement";
import { deleteRenderCustomDomain } from "../../helpers/renderCustomDomains";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const body = await request.json() as { domainId?: unknown };
    if (typeof body.domainId !== "string" || !body.domainId) {
      return new Response(superjson.stringify({ error: "A domain ID is required." }), { status: 400 });
    }
    const found = await sql<{
      id: string; business_id: string; hostname: string;
      render_custom_domain_id: string | null; is_primary: boolean;
    }>`select d.id, d.business_id, d.hostname, d.render_custom_domain_id, d.is_primary
        from business_domains d
        join businesses b on b.id = d.business_id
       where d.id = ${body.domainId} and b.owner_id = ${user.id}
       limit 1`.execute(db);
    const domain = found.rows[0];
    if (!domain) return new Response(superjson.stringify({ error: "Domain not found." }), { status: 404 });

    if (domain.render_custom_domain_id) {
      await deleteRenderCustomDomain(domain.render_custom_domain_id);
    }

    await db.transaction().execute(async (trx) => {
      await sql`delete from business_domains where id = ${domain.id}`.execute(trx);
      await sql`update businesses
        set custom_domain = null, custom_domain_status = 'disabled',
            custom_domain_verified_at = null, updated_at = now()
        where id = ${domain.business_id}
          and lower(split_part(split_part(regexp_replace(custom_domain, '^https?://', '', 'i'), '/', 1), ':', 1)) = ${domain.hostname}`.execute(trx);
      if (domain.is_primary) {
        const next = await sql<{ id: string }>`select id from business_domains
          where business_id = ${domain.business_id} and status = 'active' and ssl_status = 'active'
          order by created_at asc limit 1`.execute(trx);
        if (next.rows[0]) {
          await sql`update business_domains set is_primary = true, updated_at = now()
            where id = ${next.rows[0].id}`.execute(trx);
        }
      }
    });
    return new Response(superjson.stringify({ success: true, hostname: domain.hostname }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove this domain.";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}
