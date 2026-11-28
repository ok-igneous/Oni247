import type { Metadata } from "next";
import GalleriesPage from "../_components/dashboard.galleries";

export const metadata: Metadata = { title: "Galleries — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <GalleriesPage />; }
