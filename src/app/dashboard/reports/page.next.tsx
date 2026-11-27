import type { Metadata } from "next";
import ReportsNext from "../Reports.next";

export const metadata: Metadata = { title: "Reports — Oni247", robots: { index: false, follow: false } };

export default function ReportsPage() {
  return <ReportsNext />;
}
