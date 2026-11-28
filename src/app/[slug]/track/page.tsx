import type { Metadata } from "next";
import BusinessTrackEntryPage from "../../_components/BusinessTrackEntryPage";

type Props = { params: Promise<{ slug: string }> };
export const metadata: Metadata = { title: "Track an order", robots: { index: false, follow: false } };
export default async function Page({ params }: Props) { const { slug } = await params; return <BusinessTrackEntryPage slug={slug} />; }
