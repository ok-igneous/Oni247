import type { Metadata } from "next";
import PlanPage from "../_components/dashboard.plan";

export const metadata: Metadata = { title: "Plan — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <PlanPage />; }
