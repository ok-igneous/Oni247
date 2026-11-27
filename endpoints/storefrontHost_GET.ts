import { sql } from "kysely";
import { db } from "../helpers/db";
import { normalizeDomainHost } from "../server/storefrontPrerender";

/** Resolve only verified custom domains; platform storefronts use /{slug}. */
export async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    const configuredRoot = process.env.PLATFORM_ROOT_DOMAIN || process.env.APP_BASE_URL || null;
    const host = normalizeDomainHost(`https://${url.hostname}`);
    const platform = normalizeDomainHost(configuredRoot);
    const platformRoot = platform?.replace(/^www\./, "") ?? null;
    let slug: string | null = null;

    const isPlatformHost = host === platformRoot ||
      host === (platformRoot ? `www.${platformRoot}` : null);

    if (host && !isPlatformHost) {
      const normalizedStoredHost = sql<string | null>`case
        when lower("custom_domain") like 'http://%' then null
        else lower(split_part(split_part(regexp_replace("custom_domain", '^https?://', '', 'i'), '/', 1), ':', 1))
      end`;
      const business = await db.selectFrom("businesses")
        .select("slug")
        .where("status", "=", "published")
        .where("customDomainStatus", "=", "verified")
        .where(normalizedStoredHost, "=", host)
        .limit(1)
        .executeTakeFirst();
      slug = business?.slug ?? null;
    }

    return new Response(JSON.stringify({ slug }), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(JSON.stringify({ slug: null }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
