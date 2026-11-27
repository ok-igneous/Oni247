import { db } from "../helpers/db";
import { subscriptionPlan } from "../helpers/subscriptionPlan";
import { loadPlanConfig } from "../helpers/planConfig";

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
  const platformOrigin = new URL(request.url).origin;
  const businesses = await db.selectFrom("businesses")
    .select(["id", "slug", "plan", "websitePlan", "trialEndsAt", "planRenewsAt", "customDomain", "customDomainStatus"])
    .where("status", "=", "published")
    .execute();

  const urls = new Set<string>([new URL("/", platformOrigin).toString()]);
  const businessIds = businesses.map((business) => business.id);

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

    for (const business of businesses) {
      const plan = subscriptionPlan.resolve(business);
      const host = business.customDomainStatus === "verified" && plan.canUseCustomDomain
        ? safeHost(business.customDomain)
        : null;
      const origin = host ?? platformOrigin;
      const storePath = host ? "/" : `/${encodeURIComponent(business.slug)}`;
      const add = (path: string) => urls.add(new URL(path, origin).toString());
      add(storePath);

      for (const product of productsByBusiness.get(business.id) ?? []) {
        add(`${storePath.replace(/\/$/, "")}/p/${encodeURIComponent(product.slug)}`);
      }

      if (plan.canUseMultiPage) {
        for (const page of ["products", "services", "about", "gallery", "blog", "events", "contact"]) {
          add(`${storePath.replace(/\/$/, "")}/${page}`);
        }
      }
      if (plan.canUseMultiPage) {
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
