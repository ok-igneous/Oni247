import type { Metadata } from "next";
import { LoginPageNext } from "../_components/AuthPages.next";

export const metadata: Metadata = { title: "Log in — Oni247", robots: { index: false, follow: false } };

export default function LoginPage() {
  return <LoginPageNext />;
}
