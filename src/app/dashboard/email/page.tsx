import type { Metadata } from "next";
import EmailPage from "../_components/dashboard.email";

export const metadata: Metadata = { title: "Email — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <EmailPage />; }
