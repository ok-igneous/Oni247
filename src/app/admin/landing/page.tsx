import type { Metadata } from "next";
import LandingPage from "../_components/admin.landing";

export const metadata: Metadata = { title: "Landing — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <LandingPage />; }
