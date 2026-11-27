import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import StorefrontPageNext from "../_components/StorefrontPage.next";
import StoreSectionPageNext from "../_components/StoreSectionPage.next";
import { getStorefrontData, resolveStorefrontHost, storefrontMetadata } from "../_lib/storefront.server";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
const sectionPages = new Set(["products", "services", "about", "gallery", "blog", "events", "contact"]);

async function getPageData(params: Props["params"]) {
  const [{ slug: pathSegment }, requestHeaders] = await Promise.all([params, headers()]);
  const host = requestHeaders.get("host") ?? "";
  const resolved = await resolveStorefrontHost(host);
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const origin = host ? `${protocol}://${host}` : "https://www.oni247.org";

  if (resolved.platformHost) {
    const data = await getStorefrontData(pathSegment);
    if (!data) notFound();
    return { kind: "home" as const, slug: pathSegment, data, origin };
  }

  // On a verified custom domain, /products, /about, etc. are section paths,
  // not business slugs. Resolve the business from the Host header first.
  if (resolved.slug && sectionPages.has(pathSegment)) {
    const data = await getStorefrontData(resolved.slug);
    if (!data) notFound();
    return { kind: "section" as const, slug: resolved.slug, page: pathSegment, data, origin };
  }

  notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPageData(params);
  if (page.kind === "section") {
    const title = page.page === "about" ? "About us" : page.page[0].toUpperCase() + page.page.slice(1);
    return {
      ...storefrontMetadata(page.data, new URL(`/${page.page}`, page.origin).toString()),
      title: `${title} — ${page.data.business.name}`,
    };
  }
  return storefrontMetadata(page.data, `${page.origin}/${encodeURIComponent(page.slug)}`);
}

export default async function VanityStorefrontPage({ params }: Props) {
  const page = await getPageData(params);
  if (page.kind === "section") {
    return <StoreSectionPageNext slug={page.slug} page={page.page} initialData={page.data} customDomain />;
  }
  return <StorefrontPageNext slug={page.slug} initialData={page.data} customDomain={false} origin={page.origin} />;
}
