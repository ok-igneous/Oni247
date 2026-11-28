import type { Metadata } from "next";
import ThemePage from "../_components/dashboard.theme";

export const metadata: Metadata = { title: "Theme — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <ThemePage />; }
