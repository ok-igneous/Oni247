import type { Metadata } from "next";
import PaymentsPage from "../_components/dashboard.payments";

export const metadata: Metadata = { title: "Payments — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <PaymentsPage />; }
