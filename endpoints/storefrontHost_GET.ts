import { sql } from "kysely";
import { db } from "../helpers/db";
import { loadPlanConfig } from "../helpers/planConfig";
import { subscriptionPlan } from "../helpers/subscriptionPlan";
import { normalizeDomainHost, resolvePlatformSubdomainSlug } from "../server/storefrontPrerender";

/** Resolve the current request host to a published storefront without changing its URL. */
export async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    await loadPlanConfig();
    const configuredRoot = process.env.PLATFORM_ROOT_DOMAIN || process.env.APP_BASE_URL || null;
    const subdomainSlug = resolvePlatformSubdomainSlug(url.hostname, configuredRoot);
    let slug: string | null = null;

    if (subdomainSlug) {
      const business = await db.selectFrom("businesses")
        .select("slug")
        .where("slug", "=", subdomainSlug)
        .where("status", "=", "published")
        .limit(1)
        .executeTakeFirst();
      slug = business?.slug ?? null;
    } else {
      const host = normalizeDomainHost(`https://${url.hostname}`);
      const platform = normalizeDomainHost(configuredRoot);
      const platformRoot = platform?.replace(/^www\./, "") ?? null;
      if (host && host !== platformRoot && host !== (platformRoot ? `www.${platformRoot}` : null)) {
        const domainMatch = await sql<{ business_id: string; slug: string }>`
          select b.id as business_id, b.slug
            from business_domains d
            join businesses b on b.id = d.business_id
           where d.hostname = ${host}
             and d.domain_type = 'customer_domain'
             and d.status = 'active'
             and d.ssl_status = 'active'
             and b.status = 'published'
           limit 1`.execute(db);
        const matched = domainMatch.rows[0];
        if (matched) {
          const business = await db.selectFrom("businesses").selectAll()
            .where("id", "=", matched.business_id).limit(1).executeTakeFirst();
          if (business && subscriptionPlan.resolve(business).source === "paid") slug = matched.slug;
        }

        // Keep previously verified single-domain records working during migration.
        if (!slug) {
          const normalizedStoredHost = sql<string | null>`case
            when lower("custom_domain") like 'http://%' then null
            else lower(split_part(split_part(regexp_replace("custom_domain", '^https?://', '', 'i'), '/', 1), ':', 1))
          end`;
          const business = await db.selectFrom("businesses")
            .selectAll()
            .where("status", "=", "published")
            .where("customDomainStatus", "=", "verified")
            .where(normalizedStoredHost, "=", host)
            .limit(1)
            .executeTakeFirst();
          if (business && subscriptionPlan.resolve(business).source === "paid") slug = business.slug;
        }
      }
    }

    return new Response(JSON.stringify({ slug }), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  } catch {
    return new Response(JSON.stringify({ slug: null }), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  }
}
