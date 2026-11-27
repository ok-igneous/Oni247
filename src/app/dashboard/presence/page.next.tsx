import type { Metadata } from "next";
import PresenceNext from "../Presence.next";

export const metadata: Metadata = { title: "Storefront content — Oni247", robots: { index: false, follow: false } };

export default function PresencePage() {
  return <PresenceNext />;
}
