import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import StorefrontPageNext from "../_components/StorefrontPage.next";
import { getStorefrontData, resolveStorefrontHost, storefrontMetadata } from "../_lib/storefront.server";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

async function getPageData(params: Props["params"]) {
  const [{ slug }, requestHeaders] = await Promise.all([params, headers()]);
  const host = requestHeaders.get("host") ?? "";
  const resolved = await resolveStorefrontHost(host);
  if (!resolved.platformHost) notFound();
  const data = await getStorefrontData(slug);
  if (!data) notFound();
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const origin = host ? `${protocol}://${host}` : "https://www.oni247.org";
  return { slug, data, origin };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, data, origin } = await getPageData(params);
  return storefrontMetadata(data, `${origin}/${encodeURIComponent(slug)}`);
}

export default async function VanityStorefrontPage({ params }: Props) {
  const { slug, data } = await getPageData(params);
  const { origin } = await getPageData(params);
  return <StorefrontPageNext slug={slug} initialData={data} customDomain={false} origin={origin} />;
}
