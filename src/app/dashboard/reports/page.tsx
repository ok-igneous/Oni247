import type { Metadata } from "next";
import ReportsPage from "../_components/dashboard.reports";

export const metadata: Metadata = { title: "Reports — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <ReportsPage />; }
