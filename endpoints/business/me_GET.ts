import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { hasPaidCustomDomainAccess } from "../../helpers/domainEntitlement";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import type { OutputType } from "./me_GET.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const business = await db.selectFrom("businesses").selectAll()
      .where("ownerId", "=", user.id).limit(1).executeTakeFirst();

    const configuredBase = process.env.APP_BASE_URL || "https://oni247.org";
    const platformRootDomain = new URL(
      configuredBase.includes("://") ? configuredBase : `https://${configuredBase}`,
    ).hostname.toLowerCase();
    const canUseCustomDomains = business ? await hasPaidCustomDomainAccess(user.id) : false;
    const primary = business && canUseCustomDomains
      ? await sql<{ hostname: string }>`select hostname from business_domains
          where business_id = ${business.id} and is_primary = true
            and status = 'active' and ssl_status = 'active'
          limit 1`.execute(db)
      : { rows: [] as Array<{ hostname: string }> };

    return new Response(
      superjson.stringify({
        business: business ?? null,
        platformRootDomain,
        primaryDomain: primary.rows[0]?.hostname ?? null,
        platformWildcardReady: false,
      } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not authenticated";
    return new Response(superjson.stringify({ error: message }), { status: 401 });
  }
}
