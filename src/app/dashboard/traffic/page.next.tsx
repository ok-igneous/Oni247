import type { Metadata } from "next";
import TrafficNext from "../Traffic.next";

export const metadata: Metadata = { title: "Traffic — Oni247", robots: { index: false, follow: false } };

export default function TrafficPage() {
  return <TrafficNext />;
}
