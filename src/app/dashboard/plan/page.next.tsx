import type { Metadata } from "next";
import { Suspense } from "react";
import PlanNext from "../Plan.next";

export const metadata: Metadata = { title: "Plan — Oni247", robots: { index: false, follow: false } };

export default function PlanPage() {
  return <Suspense fallback={<p>Loading plan details…</p>}><PlanNext /></Suspense>;
}
