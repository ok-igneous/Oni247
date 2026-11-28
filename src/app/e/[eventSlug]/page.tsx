import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import PublicEventNext from "../../_components/EventDetail.next";
import { getPublicEventData, getPublicEventsData, resolveStorefrontHost } from "../../_lib/storefront.server";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ eventSlug: string }> };

async function getPageData(params: Props["params"]) {
  const [{ eventSlug }, requestHeaders] = await Promise.all([params, headers()]);
  const host = requestHeaders.get("host") ?? "";
  const resolved = await resolveStorefrontHost(host);
  if (resolved.platformHost || !resolved.slug) notFound();
  const [data, others] = await Promise.all([getPublicEventData(resolved.slug, eventSlug), getPublicEventsData(resolved.slug)]);
  if (!data || !data.event.published) notFound();
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const origin = host ? `${protocol}://${host}` : "https://oni247.org";
  const canonical = new URL(`/e/${encodeURIComponent(eventSlug)}`, origin).toString();
  return { data, others: others.events, eventSlug, origin, canonical };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data, canonical } = await getPageData(params);
  const { event, business } = data;
  const description = event.description.slice(0, 200);
  return {
    title: `${event.title} — ${business.name}`,
    description,
    alternates: { canonical },
    openGraph: { type: "website", title: `${event.title} — ${business.name}`, description, url: canonical, siteName: business.name, ...(event.coverImageUrl ? { images: [event.coverImageUrl] } : {}) },
    twitter: { card: event.coverImageUrl ? "summary_large_image" : "summary", title: `${event.title} — ${business.name}`, description, ...(event.coverImageUrl ? { images: [event.coverImageUrl] } : {}) },
  };
}

export default async function CustomDomainEventDetailPage({ params }: Props) {
  const { data, others, eventSlug, origin } = await getPageData(params);
  return <PublicEventNext data={data} others={others} eventSlug={eventSlug} customDomain origin={origin} />;
}
