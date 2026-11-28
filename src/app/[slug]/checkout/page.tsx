import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import CheckoutNext from "../../_components/Checkout.next";
import { resolveStorefrontHost } from "../../_lib/storefront.server";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ ref?: string | string[] }> };
export async function generateMetadata(): Promise<Metadata> { return { title: "Checkout", robots: { index: false, follow: false } }; }
export default async function VanityCheckoutPage({ params, searchParams }: Props) {
 const [{ slug }, query, h] = await Promise.all([params, searchParams, headers()]);
 const host = h.get("host") ?? "";
 const resolved = await resolveStorefrontHost(host);
 if (!resolved.platformHost) notFound();
 const ref = Array.isArray(query.ref) ? query.ref[0] : query.ref;
 return <CheckoutNext slug={slug} returnRef={ref ?? null} />;
}
