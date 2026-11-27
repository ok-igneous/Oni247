import type { Metadata } from "next";
import ServicesNext from "../Services.next";

export const metadata: Metadata = { title: "Services — Oni247", robots: { index: false, follow: false } };

export default function ServicesPage() {
  return <ServicesNext />;
}
