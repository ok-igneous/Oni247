import type { Metadata } from "next";
import EmailNext from "../Email.next";

export const metadata: Metadata = { title: "Email — Oni247", robots: { index: false, follow: false } };

export default function EmailPage() {
  return <EmailNext />;
}
