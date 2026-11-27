import { sql } from "kysely";
import { db } from "../helpers/db";
import { loadPlanConfig } from "../helpers/planConfig";
import { subscriptionPlan } from "../helpers/subscriptionPlan";
import { isUnsupportedPlatformSubdomain, normalizeDomainHost } from "../server/storefrontPrerender";

/** Resolve only verified, actively paid custom domains. Platform shops use /{slug}. */
export async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    const configuredRoot = process.env.PLATFORM_ROOT_DOMAIN || process.env.APP_BASE_URL || "https://oni247.org";
    const requestedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
      || url.searchParams.get("host")
      || url.hostname;
    const host = normalizeDomainHost(`https://${requestedHost}`);
    const platform = normalizeDomainHost(configuredRoot);
    const platformRoot = platform?.replace(/^www\./, "") ?? null;
    const isPlatformHost = host === platformRoot
      || host === (platformRoot ? `www.${platformRoot}` : null);
    if (!host || isPlatformHost || isUnsupportedPlatformSubdomain(host, configuredRoot)) {
      return new Response(JSON.stringify({ slug: null }), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    await loadPlanConfig();
    const normalizedStoredHost = sql<string | null>`case
      when lower("custom_domain") like 'http://%' then null
      else lower(split_part(split_part(regexp_replace("custom_domain", '^https?://', '', 'i'), '/', 1), ':', 1))
    end`;
    const business = await db.selectFrom("businesses")
      .select(["slug", "plan", "websitePlan", "trialEndsAt", "planRenewsAt", "premiumTrialUsed"])
      .where("status", "=", "published")
      .where("customDomainStatus", "=", "verified")
      .where(normalizedStoredHost, "=", host)
      .limit(1)
      .executeTakeFirst();

    const slug = business && subscriptionPlan.resolve(business).canUseCustomDomain
      ? business.slug
      : null;

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
