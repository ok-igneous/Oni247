import type { Metadata } from "next";
import { RegisterPageNext } from "../_components/AuthPages.next";

export const metadata: Metadata = { title: "Create an account — Oni247", robots: { index: false, follow: false } };

export default function RegisterPage() {
  return <RegisterPageNext />;
}
