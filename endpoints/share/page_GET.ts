import { db } from "../../helpers/db";

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const plain = (value: string | null | undefined, max = 200) => {
  const text = (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

const PAGE_TITLES: Record<string, string> = {
  products: "Products",
  services: "Services",
  about: "About us",
  gallery: "Gallery",
  blog: "Blog",
  events: "Events",
  contact: "Contact",
};

/** Share links point here so Facebook, WhatsApp and others see the right title, image and description. */
export async function handle(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const slug = url.searchParams.get("slug") ?? "";
  const kind = url.searchParams.get("kind") ?? "home";
  const id = url.searchParams.get("id") ?? "";

  const business = await db
    .selectFrom("businesses")
    .select(["id", "slug", "name", "description", "logoUrl", "heroImageUrl", "appearanceSettings"])
    .where("slug", "=", slug)
    .where("status", "=", "published")
    .executeTakeFirst();

  if (!business) {
    return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const base = `/${encodeURIComponent(business.slug)}`;
  const settings =
    business.appearanceSettings && typeof business.appearanceSettings === "object" && !Array.isArray(business.appearanceSettings)
      ? (business.appearanceSettings as Record<string, unknown>)
      : {};
  const seoTitle = typeof settings.seoTitle === "string" && settings.seoTitle.trim() ? settings.seoTitle.trim() : "";
  const seoDescription = typeof settings.seoDescription === "string" && settings.seoDescription.trim() ? settings.seoDescription.trim() : "";
  const shareImage = typeof settings.shareImageUrl === "string" && settings.shareImageUrl ? settings.shareImageUrl : null;

  let title = seoTitle || business.name;
  let description = plain(seoDescription || business.description) || `${business.name} on Oni247`;
  let image: string | null = shareImage ?? business.heroImageUrl ?? business.logoUrl ?? null;
  let path = base;

  if (kind === "page" && PAGE_TITLES[id]) {
    title = `${PAGE_TITLES[id]} — ${business.name}`;
    path = `${base}/${id}`;
  } else if (kind === "product") {
    const row = await db.selectFrom("products").select(["name", "description", "imageUrl", "slug"]).where("businessId", "=", business.id).where("slug", "=", id).executeTakeFirst();
    if (row) {
      title = `${row.name} — ${business.name}`;
      description = plain(row.description) || description;
      image = row.imageUrl ?? image;
      path = `${base}/p/${encodeURIComponent(row.slug)}`;
    }
  } else if (kind === "blog") {
    const row = await db.selectFrom("blogPosts").select(["title", "excerpt", "content", "coverImageUrl", "slug"]).where("businessId", "=", business.id).where("slug", "=", id).where("published", "=", true).executeTakeFirst();
    if (row) {
      title = `${row.title} — ${business.name}`;
      description = plain(row.excerpt) || plain(row.content) || description;
      image = row.coverImageUrl ?? image;
      path = `${base}/b/${encodeURIComponent(row.slug)}`;
    }
  } else if (kind === "event") {
    const row = await db.selectFrom("events").select(["title", "description", "coverImageUrl", "slug"]).where("businessId", "=", business.id).where("slug", "=", id).where("published", "=", true).executeTakeFirst();
    if (row) {
      title = `${row.title} — ${business.name}`;
      description = plain(row.description) || description;
      image = row.coverImageUrl ?? image;
      path = `${base}/e/${encodeURIComponent(row.slug)}`;
    }
  } else if (kind === "gallery") {
    const row = await db.selectFrom("galleries").select(["id", "name", "description", "coverImageUrl", "slug"]).where("businessId", "=", business.id).where("slug", "=", id).where("published", "=", true).executeTakeFirst();
    if (row) {
      const first = row.coverImageUrl ?? (await db.selectFrom("galleryImages").select(["imageUrl"]).where("galleryId", "=", row.id).orderBy("sortOrder", "asc").executeTakeFirst())?.imageUrl ?? null;
      title = `${row.name} — ${business.name}`;
      description = plain(row.description) || `Photos from ${row.name} at ${business.name}.`;
      image = first ?? image;
      path = `${base}/g/${encodeURIComponent(row.slug)}`;
    }
  }

  const target = origin + path;
  const absoluteImage = image ? (image.startsWith("http") ? image : origin + (image.startsWith("/") ? "" : "/") + image) : null;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(target)}"><meta property="og:type" content="website"><meta property="og:site_name" content="${esc(business.name)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(target)}">${absoluteImage ? `<meta property="og:image" content="${esc(absoluteImage)}"><meta name="twitter:image" content="${esc(absoluteImage)}">` : ""}<meta name="twitter:card" content="${absoluteImage ? "summary_large_image" : "summary"}"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><noscript><meta http-equiv="refresh" content="0;url=${esc(target)}"></noscript><script>location.replace(${JSON.stringify(target)})</script></head><body><p><a href="${esc(target)}">${esc(title)}</a></p></body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
  });
}

