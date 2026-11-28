import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import StorefrontPageNext from "../_components/StorefrontPage.next";
import { getStorefrontData, resolveStorefrontHost, storefrontMetadata } from "../_lib/storefront.server";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

const multiPageSlugs = new Set(["about", "products", "services", "gallery", "blog", "events", "contact"] as const);
type MultiPageSlug = "about" | "products" | "services" | "gallery" | "blog" | "events" | "contact";

async function getPageData(params: Props["params"]) {
  const [{ slug: requestedSlug }, requestHeaders] = await Promise.all([params, headers()]);
  const host = requestHeaders.get("host") ?? "";
  const resolved = await resolveStorefrontHost(host);
  const customDomainPage = resolved.customDomain && !!resolved.slug && multiPageSlugs.has(requestedSlug as MultiPageSlug);
  if (!resolved.platformHost && !customDomainPage) notFound();

  const slug = customDomainPage ? resolved.slug! : requestedSlug;
  const pageSlug = customDomainPage ? requestedSlug as MultiPageSlug : undefined;
  const data = await getStorefrontData(slug);
  if (!data) notFound();
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const origin = host ? `${protocol}://${host}` : "https://oni247.org";
  return { slug, data, origin, pageSlug, customDomain: customDomainPage };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, data, origin } = await getPageData(params);
  if (!data) return { title: "Oni247", robots: { index: false, follow: false } };
  return storefrontMetadata(data, `${origin}/${encodeURIComponent(slug)}`);
}

export default async function VanityStorefrontPage({ params }: Props) {
  const { slug, data, origin } = await getPageData(params);
  if (!data) notFound();
  return <StorefrontPageNext slug={slug} initialData={data} customDomain={false} origin={origin} />;
}
