import type { Metadata } from "next";
import BusinessSettingsNext from "../BusinessSettings.next";

export const metadata: Metadata = { title: "Business — Oni247", robots: { index: false, follow: false } };

export default function BusinessSettingsPage() {
  return <BusinessSettingsNext />;
}
