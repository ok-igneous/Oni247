import type { Metadata } from "next";
import BusinessesNext from "../Businesses.next";

export const metadata: Metadata = { title: "Businesses — Oni247 Admin", robots: { index: false, follow: false } };

export default function BusinessesPage() {
  return <BusinessesNext />;
}
