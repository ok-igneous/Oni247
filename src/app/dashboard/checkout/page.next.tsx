import type { Metadata } from "next";
import CheckoutSettingsNext from "../CheckoutSettings.next";

export const metadata: Metadata = { title: "CheckoutSettings — Oni247", robots: { index: false, follow: false } };

export default function CheckoutSettingsPage() {
  return <CheckoutSettingsNext />;
}
