import type { Metadata } from "next";
import TrafficPage from "../_components/dashboard.traffic";

export const metadata: Metadata = { title: "Traffic — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <TrafficPage />; }
