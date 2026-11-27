import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import TrackEntryNext from "../../../_components/TrackEntry.next";
import { resolveStorefrontHost } from "../../../_lib/storefront.server";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Track your order", robots: { index: false, follow: false } };
type Props = { params: Promise<{ slug: string }> };
export default async function VanityTrackEntryPage({ params }: Props) {
 const [{ slug }, h] = await Promise.all([params, headers()]);
 const resolved = await resolveStorefrontHost(h.get("host") ?? "");
 if (!resolved.platformHost) notFound();
 return <TrackEntryNext slug={slug} />;
}
