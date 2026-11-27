import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { OutputType as ShowcaseOutput } from "../../../../endpoints/showcase_GET.schema";
import ServiceDetailNext from "../../_components/ServiceDetail.next";
import ShowcaseNext from "../../_components/Showcase.next";
import { getShowcaseData, getStorefrontData, resolveStorefrontHost } from "../../_lib/storefront.server";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ serviceId: string }> };

async function getPageData(params: Props["params"]) {
  const [{ serviceId }, requestHeaders] = await Promise.all([params, headers()]);
  const host = requestHeaders.get("host") ?? "";
  const resolved = await resolveStorefrontHost(host);
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const origin = host ? `${protocol}://${host}` : "https://www.oni247.org";

  // /s/{code} is a public collection link on the platform host. On a verified
  // business domain, /s/{serviceId} remains the service-detail URL.
  if (resolved.platformHost) {
    const showcase = await getShowcaseData(serviceId);
    if (!showcase) notFound();
    return {
      kind: "showcase" as const,
      data: showcase,
      canonical: new URL(`/s/${encodeURIComponent(serviceId)}`, origin).toString(),
    };
  }

  if (!resolved.slug) notFound();
  const data = await getStorefrontData(resolved.slug);
  const service = data?.services.find((item) => item.id === serviceId);
  if (!data || !service) notFound();
  return {
    kind: "service" as const,
    data,
    service,
    canonical: new URL(`/s/${encodeURIComponent(serviceId)}`, origin).toString(),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPageData(params);
  if (page.kind === "showcase") {
    const description = page.data.showcase.description ?? `${page.data.products.length} picks from ${page.data.business.name}.`;
    const image = page.data.products[0]?.imageUrl || undefined;
    return {
      title: `${page.data.showcase.title} — ${page.data.business.name}`,
      description,
      alternates: { canonical: page.canonical },
      openGraph: {
        type: "website",
        title: page.data.showcase.title,
        description,
        url: page.canonical,
        ...(image ? { images: [image] } : {}),
      },
      twitter: { card: image ? "summary_large_image" : "summary", title: page.data.showcase.title, description, ...(image ? { images: [image] } : {}) },
    };
  }

  const description = page.service.description || `${page.service.name} from ${page.data.business.name}`;
  return {
    title: `${page.service.name} — ${page.data.business.name}`,
    description,
    alternates: { canonical: page.canonical },
    openGraph: { type: "website", title: `${page.service.name} — ${page.data.business.name}`, description, url: page.canonical, ...(page.service.imageUrl ? { images: [page.service.imageUrl] } : {}) },
  };
}

export default async function PublicShortLinkPage({ params }: Props) {
  const page = await getPageData(params);
  if (page.kind === "showcase") return <ShowcaseNext data={page.data as ShowcaseOutput} />;
  return <ServiceDetailNext data={page.data} serviceId={page.service.id} customDomain />;
}
