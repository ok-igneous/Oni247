import type { Metadata } from "next";
import TrackLookupPage from "../_components/TrackLookupPage";

export const metadata: Metadata = { title: "Track an order — Oni247", description: "Check the status of an order using your reference code.", robots: { index: false, follow: false } };

export default function Page() { return <TrackLookupPage />; }
