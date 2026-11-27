import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import CheckoutNext from "../_components/Checkout.next";
import { resolveStorefrontHost } from "../_lib/storefront.server";
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ ref?: string | string[] }> };
export async function generateMetadata(): Promise<Metadata> { return { title: "Checkout", robots: { index: false, follow: false } }; }
export default async function CustomDomainCheckoutPage({ searchParams }: Props) {
 const [query, h] = await Promise.all([searchParams, headers()]);
 const host = h.get("host") ?? "";
 const resolved = await resolveStorefrontHost(host);
 if (!resolved.customDomain || !resolved.slug) notFound();
 const ref = Array.isArray(query.ref) ? query.ref[0] : query.ref;
 return <CheckoutNext slug={resolved.slug} customDomain returnRef={ref ?? null} />;
}
