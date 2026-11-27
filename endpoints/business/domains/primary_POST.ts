import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../../helpers/db";
import { getServerUserSession } from "../../../helpers/getServerUserSession";
import { hasPaidCustomDomainAccess } from "../../../helpers/domainEntitlement";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const body = await request.json() as { domainId?: unknown };

    if (body.domainId === "path") {
      const business = await db.selectFrom("businesses").select(["id"])
        .where("ownerId", "=", user.id).limit(1).executeTakeFirst();
      if (!business) return new Response(superjson.stringify({ error: "Business not found." }), { status: 404 });

      await sql`update business_domains set is_primary = false, updated_at = now()
        where business_id = ${business.id}`.execute(db);
      return new Response(superjson.stringify({ success: true, primaryDomain: null }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    if (!(await hasPaidCustomDomainAccess(user.id))) {
      return new Response(superjson.stringify({ error: "Custom domains are available on active paid plans only. Your Oni247 /slug address remains available." }), { status: 403 });
    }

    if (typeof body.domainId !== "string" || !body.domainId) {
      return new Response(superjson.stringify({ error: "A domain ID is required." }), { status: 400 });
    }
    const owned = await sql<{ id: string; business_id: string }>`
      select d.id, d.business_id
        from business_domains d
        join businesses b on b.id = d.business_id
       where d.id = ${body.domainId} and b.owner_id = ${user.id}
         and d.status = 'active' and d.ssl_status = 'active'
       limit 1`.execute(db);
    const domain = owned.rows[0];
    if (!domain) {
      return new Response(superjson.stringify({ error: "Only an active, HTTPS-ready customer domain can be primary." }), { status: 409 });
    }
    await db.transaction().execute(async (trx) => {
      await sql`update business_domains set is_primary = false, updated_at = now()
        where business_id = ${domain.business_id}`.execute(trx);
      await sql`update business_domains set is_primary = true, updated_at = now()
        where id = ${domain.id} and business_id = ${domain.business_id}`.execute(trx);
    });
    return new Response(superjson.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not set primary domain.";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}
