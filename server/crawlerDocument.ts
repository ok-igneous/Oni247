import { escapeHtml, injectCrawlerHtml } from "./storefrontPrerender";

export type CrawlerSnapshot = {
  title: string;
  description: string;
  body: string;
  image?: string;
  jsonLd?: unknown;
};

export type CrawlerDocumentInput = {
  indexHtml: string;
  snapshot: CrawlerSnapshot;
  canonicalUrl: string;
};

export function renderCrawlerDocument({ indexHtml, snapshot, canonicalUrl }: CrawlerDocumentInput): string {
  const description = snapshot.description ?? "";
  const jsonLd = JSON.stringify(snapshot.jsonLd ?? {}).replace(/</g, "\\u003c");
  const metadata = `<title>${escapeHtml(snapshot.title)}</title><meta name="description" content="${escapeHtml(description.slice(0, 160))}"><link rel="canonical" href="${escapeHtml(canonicalUrl)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(snapshot.title)}"><meta property="og:description" content="${escapeHtml(description.slice(0, 200))}"><meta property="og:site_name" content="Oni247"><meta name="twitter:title" content="${escapeHtml(snapshot.title)}"><meta name="twitter:description" content="${escapeHtml(description.slice(0, 200))}"><meta property="og:url" content="${escapeHtml(canonicalUrl)}">${snapshot.image ? `<meta property="og:image" content="${escapeHtml(snapshot.image)}"><meta name="twitter:image" content="${escapeHtml(snapshot.image)}">` : ""}<meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${jsonLd}</script>`;
  return injectCrawlerHtml(indexHtml, metadata, snapshot.body);
}
