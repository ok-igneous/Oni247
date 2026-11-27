import type { Metadata } from "next";
import { VerifyEmailPageNext } from "../_components/AuthPages.next";

export const metadata: Metadata = { title: "Verify your email — Oni247", robots: { index: false, follow: false } };

export default function VerifyEmailPage() {
  return <VerifyEmailPageNext />;
}
