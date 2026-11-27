import type { Metadata } from "next";
import DashboardOverviewNext from "./DashboardOverview.next";

export const metadata: Metadata = { title: "Overview — Oni247", robots: { index: false, follow: false } };

export default function DashboardPage() {
  return <DashboardOverviewNext />;
}
