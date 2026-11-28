import type { Metadata } from "next";
import BusinessesPage from "../_components/admin.businesses";

export const metadata: Metadata = { title: "Businesses — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <BusinessesPage />; }
