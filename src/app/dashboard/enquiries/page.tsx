import type { Metadata } from "next";
import EnquiriesPage from "../_components/dashboard.enquiries";

export const metadata: Metadata = { title: "Enquiries — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <EnquiriesPage />; }
