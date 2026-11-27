import type { Metadata } from "next";
import EnquiriesNext from "../Enquiries.next";

export const metadata: Metadata = { title: "Enquiries — Oni247", robots: { index: false, follow: false } };

export default function EnquiriesPage() {
  return <EnquiriesNext />;
}
