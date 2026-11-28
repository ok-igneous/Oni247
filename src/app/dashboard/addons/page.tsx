import type { Metadata } from "next";
import AddonsPage from "../_components/dashboard.addons";

export const metadata: Metadata = { title: "Addons — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <AddonsPage />; }
