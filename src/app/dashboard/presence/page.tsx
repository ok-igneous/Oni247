import type { Metadata } from "next";
import PresencePage from "../_components/dashboard.presence";

export const metadata: Metadata = { title: "Presence — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <PresencePage />; }
