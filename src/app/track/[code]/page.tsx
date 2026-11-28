import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import TrackOrderNext from "../../_components/TrackOrder.next";
import { resolveStorefrontHost } from "../../_lib/storefront.server";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ code: string }> };
export async function generateMetadata(): Promise<Metadata> { return { title: "Track order", robots: { index: false, follow: false } }; }
export default async function CustomDomainTrackPage({ params }: Props) {
 const [{ code }, h] = await Promise.all([params, headers()]);
 const host = h.get("host") ?? "";
 const resolved = await resolveStorefrontHost(host);
 if (!resolved.customDomain && !resolved.platformHost) notFound();
 return <TrackOrderNext code={code} expectedSlug={resolved.customDomain ? resolved.slug ?? undefined : undefined} customDomain={resolved.customDomain} />;
}
