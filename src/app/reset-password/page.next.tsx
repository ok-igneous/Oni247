import type { Metadata } from "next";
import { ResetPasswordPageNext } from "../_components/ResetPassword.next";

export const metadata: Metadata = { title: "Set new password — Oni247", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return <ResetPasswordPageNext />;
}
