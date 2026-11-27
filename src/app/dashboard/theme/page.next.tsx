import type { Metadata } from "next";
import { Suspense } from "react";
import ThemeNext from "../Theme.next";

export const metadata: Metadata = { title: "Appearance — Oni247", robots: { index: false, follow: false } };

export default function ThemePage() {
  return <Suspense fallback={<p>Loading theme editor…</p>}><ThemeNext /></Suspense>;
}
