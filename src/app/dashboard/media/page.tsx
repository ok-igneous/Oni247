import type { Metadata } from "next";
import MediaPage from "../_components/dashboard.media";

export const metadata: Metadata = { title: "Media — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <MediaPage />; }
