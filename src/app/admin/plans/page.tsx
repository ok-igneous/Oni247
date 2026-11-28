import type { Metadata } from "next";
import PlansPage from "../_components/admin.plans";

export const metadata: Metadata = { title: "Plans — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <PlansPage />; }
