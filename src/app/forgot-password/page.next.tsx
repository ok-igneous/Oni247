import type { Metadata } from "next";
import { ForgotPasswordPageNext } from "../_components/AuthPages.next";

export const metadata: Metadata = { title: "Forgot password — Oni247", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageNext />;
}
