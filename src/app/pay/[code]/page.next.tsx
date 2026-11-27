import type { Metadata } from "next";
import { Suspense } from "react";
import PaymentLinkNext from "../../_components/PaymentLink.next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Secure payment", robots: { index: false, follow: false } };
}

export default async function PaymentLinkPage({ params }: Props) {
  const { code } = await params;
  return <Suspense fallback={<main style={{ minHeight: "100vh" }} />}>
    <PaymentLinkNext code={code} />
  </Suspense>;
}
