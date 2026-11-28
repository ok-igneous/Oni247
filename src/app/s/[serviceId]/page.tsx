import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ServiceDetailNext from "../../_components/ServiceDetail.next";
import ShowcasePageNext from "../../_components/ShowcasePage.next";
import { getStorefrontData, resolveStorefrontHost } from "../../_lib/storefront.server";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ serviceId: string }> };

async function getPageData(params: Props["params"]) {
  const [{ serviceId }, requestHeaders] = await Promise.all([params, headers()]);
  const host = requestHeaders.get("host") ?? "";
  const resolved = await resolveStorefrontHost(host);
  if (resolved.platformHost || !resolved.slug) notFound();
  const data = await getStorefrontData(resolved.slug);
  const service = data?.services.find((item) => item.id === serviceId);
  if (!data || !service) notFound();
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const origin = host ? `${protocol}://${host}` : "https://oni247.org";
  const canonical = new URL(`/s/${encodeURIComponent(serviceId)}`, origin).toString();
  return { data, service, canonical };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ serviceId }, h] = await Promise.all([params, headers()]);
  const resolved = await resolveStorefrontHost(h.get("host") ?? "");
  if (resolved.platformHost) return { title: "Collection — Oni247", robots: { index: false, follow: false } };
  const { data, service, canonical } = await getPageData(params);
  const description = service.description || `${service.name} from ${data.business.name}`;
  return {
    title: `${service.name} — ${data.business.name}`,
    description,
    alternates: { canonical },
    openGraph: { type: "website", title: `${service.name} — ${data.business.name}`, description, url: canonical, ...(service.imageUrl ? { images: [service.imageUrl] } : {}) },
  };
}

export default async function CustomDomainServiceDetailPage({ params }: Props) {
  const { serviceId } = await params;
  const host = (await headers()).get("host") ?? "";
  const resolved = await resolveStorefrontHost(host);
  if (resolved.platformHost) return <ShowcasePageNext code={serviceId} />;
  const { data, service } = await getPageData(params);
  return <ServiceDetailNext data={data} serviceId={service.id} customDomain />;
}
