import type { Metadata } from "next";
import { Suspense } from "react";
import AddonsNext from "../Addons.next";

export const metadata: Metadata = { title: "Addons — Oni247", robots: { index: false, follow: false } };

export default function AddonsPage() {
  return <Suspense fallback={<p>Loading add-ons…</p>}><AddonsNext /></Suspense>;
}
