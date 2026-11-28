import type { Metadata } from "next";
import SettingsPage from "../_components/admin.settings";

export const metadata: Metadata = { title: "Settings — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <SettingsPage />; }
