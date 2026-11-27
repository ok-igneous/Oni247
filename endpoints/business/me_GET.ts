import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import type { OutputType } from "./me_GET.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

    const business = await db
      .selectFrom("businesses")
      .selectAll()
      .where("ownerId", "=", user.id)
      .limit(1)
      .executeTakeFirst();

    const configuredRoot = process.env.PLATFORM_ROOT_DOMAIN || "oni247.org";
    const platformRootDomain = new URL(
      configuredRoot.includes("://") ? configuredRoot : `https://${configuredRoot}`,
    ).hostname.toLowerCase();

    const platformWildcardReady = process.env.PLATFORM_WILDCARD_READY?.trim().toLowerCase() === "true";
    const primary = business
      ? await sql<{ hostname: string }>`select hostname from business_domains
          where business_id = ${business.id} and is_primary = true
            and status = 'active' and ssl_status = 'active'
          limit 1`.execute(db)
      : { rows: [] as Array<{ hostname: string }> };
    const primaryDomain = primary.rows[0]?.hostname ??
      (business && platformWildcardReady ? `${business.slug}.${platformRootDomain}` : null);

    return new Response(
      superjson.stringify({ business: business ?? null, platformRootDomain, primaryDomain, platformWildcardReady } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not authenticated";
    return new Response(superjson.stringify({ error: message }), {
      status: 401,
    });
  }
}
