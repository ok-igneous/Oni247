import type { Metadata } from "next";
import BusinessPage from "../_components/dashboard.business";

export const metadata: Metadata = { title: "Business — Oni247", robots: { index: false, follow: false } };

export default function Page() {
  return <BusinessPage />;
}
