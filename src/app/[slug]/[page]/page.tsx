import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import StorefrontPageNext from "../../_components/StorefrontPage.next";
import { getStorefrontData, resolveStorefrontHost, storefrontMetadata } from "../../_lib/storefront.server";

export const dynamic = "force-dynamic";

const allowedPages = new Set(["about", "products", "services", "gallery", "blog", "events", "contact"] as const);
type PageSlug = "about" | "products" | "services" | "gallery" | "blog" | "events" | "contact";
type Props = { params: Promise<{ slug: string; page: string }> };

async function getPageData(params: Props["params"]) {
  const [{ slug, page }, requestHeaders] = await Promise.all([params, headers()]);
  if (!allowedPages.has(page as PageSlug)) notFound();
  const host = requestHeaders.get("host") ?? "";
  const resolved = await resolveStorefrontHost(host);
  if (!resolved.platformHost) notFound();
  const data = await getStorefrontData(slug);
  if (!data || !data.business.canUseMultiPage) notFound();
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const origin = host ? `${protocol}://${host}` : "https://oni247.org";
  return { slug, page: page as PageSlug, data, origin };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page, data, origin, slug } = await getPageData(params);
  const base = await storefrontMetadata(data, `${origin}/${encodeURIComponent(slug)}/${page}`);
  return { ...base, title: `${page[0].toUpperCase() + page.slice(1)} — ${data.business.name}` };
}

export default async function StorefrontSectionPage({ params }: Props) {
  const { slug, page, data, origin } = await getPageData(params);
  return <StorefrontPageNext slug={slug} initialData={data} customDomain={false} origin={origin} pageSlug={page} />;
}
