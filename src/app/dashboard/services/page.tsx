import type { Metadata } from "next";
import ServicesPage from "../_components/dashboard.services";

export const metadata: Metadata = { title: "Services — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <ServicesPage />; }
