import { sql } from "kysely";
import { db } from "../helpers/db";
import { loadPlanConfig } from "../helpers/planConfig";
import { subscriptionPlan } from "../helpers/subscriptionPlan";
import { readServices } from "../helpers/serviceModel";
import {
  isPlatformHostname,
  isUnsupportedPlatformSubdomain,
  normalizeDomainHost,
} from "../server/storefrontPrerender";

const xmlEscape = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&apos;");

const safeHost = (value: string | null | undefined): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
};

export async function handle(request: Request) {
  await loadPlanConfig();
  const requestUrl = new URL(request.url);
  const requestHost = normalizeDomainHost(requestUrl.host);
  const configuredRoot = process.env.PLATFORM_ROOT_DOMAIN || process.env.APP_BASE_URL || "https://oni247.org";
  const renderHost = normalizeDomainHost(process.env.RENDER_EXTERNAL_HOSTNAME);
  const localHost = requestHost === "localhost" || requestHost === "127.0.0.1" || requestHost === "::1";
  const platformHost = Boolean(requestHost && (
    isPlatformHostname(requestHost, configuredRoot) ||
    localHost ||
    (renderHost && requestHost === renderHost)
  ));

  if (!requestHost || isUnsupportedPlatformSubdomain(requestHost, configuredRoot)) {
    return new Response("Not found", { status: 404 });
  }

  const platformOrigin = platformHost
    ? safeHost(process.env.APP_BASE_URL || configuredRoot) ?? requestUrl.origin
    : requestUrl.origin;

  const normalizedStoredHost = sql<string | null>`case
    when lower("custom_domain") like 'http://%' then null
    else lower(split_part(split_part(regexp_replace("custom_domain", '^https?://', '', 'i'), '/', 1), ':', 1))
  end`;
  const baseQuery = db.selectFrom("businesses")
    .select(["id", "slug", "plan", "websitePlan", "trialEndsAt", "planRenewsAt", "customDomain", "customDomainStatus", "contentSettings"])
    .where("status", "=", "published");
  const businesses = platformHost
    ? await baseQuery.execute()
    : await baseQuery
      .where("customDomainStatus", "=", "verified")
      .where(normalizedStoredHost, "=", requestHost)
      .execute();

  const businessesWithPlan = businesses
    .map((business) => ({ business, plan: subscriptionPlan.resolve(business) }))
    .filter(({ business, plan }) =>
      platformHost || (business.customDomainStatus === "verified" && plan.canUseCustomDomain),
    );

  if (!platformHost && businessesWithPlan.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const urls = new Set<string>([new URL("/", platformOrigin).toString()]);
  const businessIds = businessesWithPlan.map(({ business }) => business.id);

  if (businessIds.length > 0) {
    const [products, galleries, blogs, events] = await Promise.all([
      db.selectFrom("products").select(["businessId", "slug"])
        .where("businessId", "in", businessIds).where("available", "=", true).execute(),
      db.selectFrom("galleries").select(["businessId", "slug"])
        .where("businessId", "in", businessIds).where("published", "=", true).execute(),
      db.selectFrom("blogPosts").select(["businessId", "slug"])
        .where("businessId", "in", businessIds).where("published", "=", true).execute(),
      db.selectFrom("events").select(["businessId", "slug"])
        .where("businessId", "in", businessIds).where("published", "=", true).execute(),
    ]);

    const byBusiness = <T extends { businessId: string }>(rows: T[]) => {
      const grouped = new Map<string, T[]>();
      for (const row of rows) grouped.set(row.businessId, [...(grouped.get(row.businessId) ?? []), row]);
      return grouped;
    };
    const productsByBusiness = byBusiness(products);
    const galleriesByBusiness = byBusiness(galleries);
    const blogsByBusiness = byBusiness(blogs);
    const eventsByBusiness = byBusiness(events);

    for (const { business, plan } of businessesWithPlan) {
      const customOrigin = business.customDomainStatus === "verified" && plan.canUseCustomDomain
        ? safeHost(business.customDomain)
        : null;
      const origin = customOrigin ?? platformOrigin;
      const storePath = customOrigin ? "/" : `/${encodeURIComponent(business.slug)}`;
      const add = (pathname: string) => urls.add(new URL(pathname, origin).toString());
      add(storePath);

      if (plan.canUseProductLinks) {
        for (const product of productsByBusiness.get(business.id) ?? []) {
          add(`${storePath.replace(/\/$/, "")}/p/${encodeURIComponent(product.slug)}`);
        }
      }
      if (plan.canUseMultiPage) {
        for (const page of ["products", "services", "about", "gallery", "blog", "events", "contact"]) {
          add(`${storePath.replace(/\/$/, "")}/${page}`);
        }
        for (const gallery of galleriesByBusiness.get(business.id) ?? []) {
          add(`${storePath.replace(/\/$/, "")}/g/${encodeURIComponent(gallery.slug)}`);
        }
      }
      if (plan.canUseBlog) {
        for (const post of blogsByBusiness.get(business.id) ?? []) {
          add(`${storePath.replace(/\/$/, "")}/b/${encodeURIComponent(post.slug)}`);
        }
      }
      if (plan.canUseEvents) {
        for (const event of eventsByBusiness.get(business.id) ?? []) {
          add(`${storePath.replace(/\/$/, "")}/e/${encodeURIComponent(event.slug)}`);
        }
      }
      if (plan.canUseServices) {
        for (const service of readServices(business.contentSettings).filter((item) => item.published)) {
          add(`${storePath.replace(/\/$/, "")}/s/${encodeURIComponent(service.id)}`);
        }
      }
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls]
    .map((url) => `  <url><loc>${xmlEscape(url)}</loc></url>`)
    .join("\n")}\n</urlset>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=900",
    },
  });
}
