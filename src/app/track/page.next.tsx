import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import TrackEntryNext from "../_components/TrackEntry.next";
import { resolveStorefrontHost } from "../_lib/storefront.server";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Track an order — Oni247", description: "Check the status of an order using your reference code.", robots: { index: false, follow: false } };
export default async function TrackEntryPage() {
 const resolved = await resolveStorefrontHost((await headers()).get("host") ?? "");
 if (!resolved.platformHost && !resolved.customDomain) notFound();
 return <TrackEntryNext slug={resolved.slug ?? undefined} customDomain={resolved.customDomain} />;
}
