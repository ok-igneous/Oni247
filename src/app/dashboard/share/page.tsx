import type { Metadata } from "next";
import SharePage from "../_components/dashboard.share";

export const metadata: Metadata = { title: "Share — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <SharePage />; }
