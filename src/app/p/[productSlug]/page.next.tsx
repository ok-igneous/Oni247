import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ProductDetailNext from "../../_components/ProductDetail.next";
import { getStorefrontData, resolveStorefrontHost } from "../../_lib/storefront.server";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ productSlug: string }> };

async function getPageData(params: Props["params"]) {
  const [{ productSlug }, requestHeaders] = await Promise.all([params, headers()]);
  const host = requestHeaders.get("host") ?? "";
  const resolved = await resolveStorefrontHost(host);
  if (resolved.platformHost || !resolved.slug) notFound();
  const data = await getStorefrontData(resolved.slug);
  const product = data?.products.find((item) => item.slug === productSlug);
  if (!data || !product || !data.business.canUseProductLinks) notFound();
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const origin = host ? `${protocol}://${host}` : "https://oni247.org";
  const canonical = new URL(`/p/${encodeURIComponent(productSlug)}`, origin).toString();
  return { data, product, canonical, origin };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data, product, canonical } = await getPageData(params);
  const description = (product.description || `${product.name} from ${data.business.name}.`).slice(0, 200);
  const image = product.imageUrl || undefined;
  return {
    title: `${product.name} — ${data.business.name}`,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    openGraph: { type: "website", title: `${product.name} — ${data.business.name}`, description, url: canonical, siteName: data.business.name, ...(image ? { images: [image] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title: `${product.name} — ${data.business.name}`, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function CustomDomainProductDetailPage({ params }: Props) {
  const { data, product, origin } = await getPageData(params);
  return <ProductDetailNext data={data} productSlug={product.slug} customDomain origin={origin} />;
}
