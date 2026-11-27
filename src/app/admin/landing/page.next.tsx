import type { Metadata } from "next";
import LandingNext from "../Landing.next";

export const metadata: Metadata = { title: "Landing — Oni247 Admin", robots: { index: false, follow: false } };

export default function LandingPage() {
  return <LandingNext />;
}
