import type { Metadata } from "next";
import PlanNext from "../Plan.next";

export const metadata: Metadata = { title: "Plan — Oni247", robots: { index: false, follow: false } };

export default function PlanPage() {
  return <PlanNext />;
}
