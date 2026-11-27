import type { Metadata } from "next";
import EventsNext from "../Events.next";

export const metadata: Metadata = { title: "Events — Oni247", robots: { index: false, follow: false } };

export default function EventsPage() {
  return <EventsNext />;
}
