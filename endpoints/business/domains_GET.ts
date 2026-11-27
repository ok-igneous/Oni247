import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const business = await db.selectFrom("businesses")
      .select(["id", "slug"])
      .where("ownerId", "=", user.id)
      .limit(1)
      .executeTakeFirst();
    if (!business) {
      return new Response(superjson.stringify({ domains: [] }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

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

    const configuredRoot = process.env.PLATFORM_ROOT_DOMAIN || "oni247.org";
    const rootHost = new URL(configuredRoot.includes("://") ? configuredRoot : `https://${configuredRoot}`).hostname.toLowerCase();
    const wildcardReady = process.env.PLATFORM_WILDCARD_READY?.trim().toLowerCase() === "true";
    const hasCustomPrimary = rows.rows.some((domain) => domain.is_primary);
    const platformDomain = {
      id: "platform",
      hostname: `${business.slug}.${rootHost}`,
      domain_type: "platform_subdomain",
      status: wildcardReady ? "active" : "pending",
      ssl_status: wildcardReady ? "active" : "pending",
      is_primary: !hasCustomPrimary,
      verified_at: null,
      render_verification_status: wildcardReady ? "verified" : "not_registered",
      last_error: null,
      last_checked_at: null,
      created_at: new Date(0),
      is_default: true,
    };

    return new Response(superjson.stringify({ domains: [platformDomain, ...rows.rows] }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not authenticated";
    return new Response(superjson.stringify({ error: message }), { status: 401 });
  }
}
