import type { Metadata } from "next";
import PlansNext from "../Plans.next";

export const metadata: Metadata = { title: "Plans — Oni247 Admin", robots: { index: false, follow: false } };

export default function PlansPage() {
  return <PlansNext />;
}
