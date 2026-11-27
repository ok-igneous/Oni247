import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import GalleryDetailNext from "../../../_components/GalleryDetail.next";
import { getPublicGalleryData, resolveStorefrontHost } from "../../../_lib/storefront.server";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string; gallerySlug: string }> };

async function getPageData(params: Props["params"]) {
  const [{ slug, gallerySlug }, requestHeaders] = await Promise.all([params, headers()]);
  const host = requestHeaders.get("host") ?? "";
  const resolved = await resolveStorefrontHost(host);
  if (!resolved.platformHost) notFound();
  const data = await getPublicGalleryData(slug, gallerySlug);
  if (!data) notFound();
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const origin = host ? `${protocol}://${host}` : "https://oni247.org";
  const canonical = new URL(`/${encodeURIComponent(slug)}/g/${encodeURIComponent(gallerySlug)}`, origin).toString();
  return { data, gallerySlug, origin, canonical };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data, canonical } = await getPageData(params);
  const { gallery, business } = data;
  const description = gallery.description ?? `Photos from ${gallery.name} at ${business.name}.`;
  return {
    title: `${gallery.name} — ${business.name}`,
    description,
    alternates: { canonical },
    openGraph: { type: "website", title: `${gallery.name} — ${business.name}`, description, url: canonical, ...(gallery.coverImageUrl ? { images: [gallery.coverImageUrl] } : {}) },
    twitter: { card: gallery.coverImageUrl ? "summary_large_image" : "summary", title: `${gallery.name} — ${business.name}`, description, ...(gallery.coverImageUrl ? { images: [gallery.coverImageUrl] } : {}) },
  };
}

export default async function VanityGalleryDetailPage({ params }: Props) {
  const { data, gallerySlug, origin } = await getPageData(params);
  return <GalleryDetailNext data={data} gallerySlug={gallerySlug} customDomain={false} origin={origin} />;
}
