import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPasswordPage from "../_components/ResetPasswordPage";

export const metadata: Metadata = { title: "Set new password — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <Suspense fallback={<main aria-busy="true" />}><ResetPasswordPage /></Suspense>; }
