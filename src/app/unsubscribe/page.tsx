import type { Metadata } from "next";
import { Suspense } from "react";
import UnsubscribePage from "../_components/UnsubscribePage";

export const metadata: Metadata = { title: "Unsubscribe — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <Suspense fallback={<main aria-busy="true" /> }><UnsubscribePage /></Suspense>; }
