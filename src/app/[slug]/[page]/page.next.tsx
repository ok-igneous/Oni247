import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StoreSectionPageNext from "../../_components/StoreSectionPage.next";
import { getStorefrontData, storefrontMetadata } from "../../_lib/storefront.server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; page: string }> };
const validPages = new Set(["products", "services", "about", "gallery", "blog", "events", "contact"]);

async function getPageData(params: Props["params"]) {
  const { slug, page } = await params;
  if (!validPages.has(page)) notFound();
  const data = await getStorefrontData(slug);
  if (!data) notFound();
  const canonical = `https://www.oni247.org/${encodeURIComponent(slug)}/${encodeURIComponent(page)}`;
  return { slug, page, data, canonical };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data, page, canonical } = await getPageData(params);
  const title = page === "about" ? "About us" : page[0].toUpperCase() + page.slice(1);
  return {
    ...storefrontMetadata(data, canonical),
    title: `${title} — ${data.business.name}`,
    alternates: { canonical },
  };
}

export default async function StorefrontSectionRoute({ params }: Props) {
  const { slug, page, data } = await getPageData(params);
  return <StoreSectionPageNext slug={slug} page={page} initialData={data} />;
}
