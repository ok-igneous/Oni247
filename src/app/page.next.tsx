import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { HomePageNext } from "./_components/HomePage.next";
import StorefrontPageNext from "./_components/StorefrontPage.next";
import { getStorefrontData, resolveStorefrontHost, storefrontMetadata } from "./_lib/storefront.server";

export const dynamic = "force-dynamic";

async function requestHostContext() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const origin = host ? `${protocol}://${host}` : "https://www.oni247.org";
  return { host, origin };
}

export async function generateMetadata(): Promise<Metadata> {
  const { host, origin } = await requestHostContext();
  const resolved = await resolveStorefrontHost(host);
  if (!resolved.slug) return resolved.platformHost
    ? { title: "Oni247 — Your business, online and ready to grow", description: "Create a professional online presence for your business with Oni247." }
    : { title: "Page not found — Oni247", robots: { index: false, follow: false } };
  const data = await getStorefrontData(resolved.slug);
  return data ? storefrontMetadata(data, `${origin}/`) : { title: "Page not found — Oni247", robots: { index: false, follow: false } };
}

export default async function HomePage() {
  const { host, origin } = await requestHostContext();
  const resolved = await resolveStorefrontHost(host);
  if (resolved.slug) {
    const data = await getStorefrontData(resolved.slug);
    if (!data) notFound();
    return <StorefrontPageNext slug={resolved.slug} initialData={data} customDomain={resolved.customDomain} origin={origin} />;
  }
  if (!resolved.platformHost) notFound();
  return <HomePageNext />;
}
