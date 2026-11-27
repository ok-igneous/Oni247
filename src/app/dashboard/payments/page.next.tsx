import type { Metadata } from "next";
import PaymentsNext from "../Payments.next";

export const metadata: Metadata = { title: "Payments — Oni247", robots: { index: false, follow: false } };

export default function PaymentsPage() {
  return <PaymentsNext />;
}
