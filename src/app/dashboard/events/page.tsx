import type { Metadata } from "next";
import EventsPage from "../_components/dashboard.events";

export const metadata: Metadata = { title: "Events — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <EventsPage />; }
