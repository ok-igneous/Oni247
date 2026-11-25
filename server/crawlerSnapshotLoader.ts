import superjson from "superjson";
import { escapeHtml } from "./storefrontPrerender";
import { storefrontSnapshot } from "./storefrontSnapshot";
import type { CrawlerSnapshot, CrawlerSnapshotRequest } from "./crawlerRenderer";

export type PublicEndpoint = (request: Request) => Promise<Response> | Response;

export type CrawlerSnapshotLoaderDependencies = {
  storefront: PublicEndpoint;
  galleryList: PublicEndpoint;
  gallery: PublicEndpoint;
};

async function readPublicResponse(endpoint: PublicEndpoint, url: string, missingMessage: string) {
  const response = await endpoint(new Request(url));
  if (!response.ok) {
    if (response.status === 404) throw new Error(missingMessage);
    throw new Error(`Public endpoint returned ${response.status}`);
  }
  return superjson.parse<any>(await response.text());
}

/** Loads and renders crawler snapshots using injected public endpoint handlers. */
export function createCrawlerSnapshotLoader(deps: CrawlerSnapshotLoaderDependencies) {
  return async function loadCrawlerSnapshot(input: CrawlerSnapshotRequest): Promise<CrawlerSnapshot> {
    const { slug, pathname, origin, customDomain } = input;
    const data = await readPublicResponse(
      deps.storefront,
      `http://localhost/_api/storefront?slug=${encodeURIComponent(slug)}`,
      "Public storefront not found",
    );
    const parts = pathname.split("/").filter(Boolean);
    const section = customDomain ? parts[0] : parts[1];
    const detailSlug = customDomain ? parts[1] : parts[2];

    if (section === "gallery" && !detailSlug) {
      const galleryData = await readPublicResponse(
        deps.galleryList,
        `http://localhost/_api/galleries/publicList?slug=${encodeURIComponent(slug)}`,
        "Public gallery not found",
      );
      const galleries = galleryData.galleries ?? [];
      const description = `Photos and project galleries from ${data.business.name}.`;
      return {
        title: `Gallery — ${data.business.name}`,
        description,
        image: galleries.find((item: any) => item.coverImageUrl)?.coverImageUrl || undefined,
        body: `<main><h1>Gallery</h1><p>${escapeHtml(description)}</p><ul>${galleries.map((item: any) => `<li><a href="${customDomain ? `/g/${encodeURIComponent(item.slug)}` : `/${encodeURIComponent(slug)}/g/${encodeURIComponent(item.slug)}`}">${escapeHtml(item.name)}</a>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}${item.coverImageUrl ? `<img src="${escapeHtml(item.coverImageUrl)}" alt="${escapeHtml(item.name)}" />` : ""}</li>`).join("")}</ul></main>`,
        jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: `Gallery — ${data.business.name}`, description, url: `${origin}${pathname}` },
      };
    }

    if (section === "g" && detailSlug) {
      const galleryData = await readPublicResponse(
        deps.gallery,
        `http://localhost/_api/galleries/public?slug=${encodeURIComponent(slug)}&gallerySlug=${encodeURIComponent(decodeURIComponent(detailSlug))}`,
        "Public gallery not found",
      );
      const item = galleryData.gallery;
      const description = item.description || `Photos from ${item.name} at ${galleryData.business.name}.`;
      const images = item.images ?? [];
      return {
        title: `${item.name} — ${galleryData.business.name}`,
        description,
        image: item.coverImageUrl || images[0]?.imageUrl || undefined,
        body: `<main><nav><a href="${customDomain ? "/" : `/${encodeURIComponent(slug)}`}">${escapeHtml(galleryData.business.name)}</a> / <a href="${customDomain ? "/gallery" : `/${encodeURIComponent(slug)}/gallery`}">Gallery</a></nav><h1>${escapeHtml(item.name)}</h1><p>${escapeHtml(description)}</p><div>${images.map((image: any) => `<figure><img src="${escapeHtml(image.imageUrl)}" alt="${escapeHtml(image.altText || image.caption || item.name)}" />${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}</figure>`).join("")}</div></main>`,
        jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: item.name, description, url: `${origin}${pathname}`, image: images.slice(0, 10).map((image: any) => image.imageUrl) },
      };
    }

    return storefrontSnapshot(data, pathname, origin, customDomain, pathname);
  };
}
