import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { hasPaidCustomDomainAccess } from "../../helpers/domainEntitlement";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const business = await db.selectFrom("businesses")
      .select(["id", "slug"])
      .where("ownerId", "=", user.id)
      .limit(1)
      .executeTakeFirst();
    if (!business) {
      return new Response(superjson.stringify({ domains: [], customDomainsAllowed: false }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    const paidAccess = await hasPaidCustomDomainAccess(user.id);
    const rows = await sql<{
      id: string; hostname: string; domain_type: string; status: string;
      ssl_status: string; is_primary: boolean; verified_at: Date | null;
      render_verification_status: string; last_error: string | null; last_checked_at: Date | null;
      created_at: Date;
    }>`select d.id, d.hostname, d.domain_type, d.status, d.ssl_status,
             d.is_primary, d.verified_at, d.render_verification_status,
             d.last_error, d.last_checked_at, d.created_at
        from business_domains d
       where d.business_id = ${business.id}
       order by d.is_primary desc, d.created_at asc`.execute(db);

    const appBaseUrl = (process.env.APP_BASE_URL || "https://oni247.org").trim().replace(/\/+$/, "");
    const hasCustomPrimary = paidAccess && rows.rows.some((domain) =>
      domain.is_primary && domain.status === "active" && domain.ssl_status === "active",
    );

    // The free/default Oni247 address is always the existing /slug URL.
    // It is represented here for the dashboard only; it is not a Render domain resource.
    const defaultAddress = {
      id: "path",
      hostname: `${appBaseUrl}/${business.slug}`,
      domain_type: "oni247_path",
      status: "active",
      ssl_status: "active",
      is_primary: !hasCustomPrimary,
      verified_at: null,
      render_verification_status: "not_applicable",
      last_error: null,
      last_checked_at: null,
      created_at: new Date(0),
      is_default: true,
    };

    return new Response(superjson.stringify({ domains: paidAccess ? [defaultAddress, ...rows.rows] : [defaultAddress],
      customDomainsAllowed: paidAccess }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not authenticated";
    return new Response(superjson.stringify({ error: message }), { status: 401 });
  }
}
