import type { Metadata } from "next";
import SettingsNext from "../Settings.next";

export const metadata: Metadata = { title: "Settings — Oni247 Admin", robots: { index: false, follow: false } };

export default function SettingsPage() {
  return <SettingsNext />;
}
