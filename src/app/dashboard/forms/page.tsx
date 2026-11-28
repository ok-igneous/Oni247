import type { Metadata } from "next";
import FormsPage from "../_components/dashboard.forms";

export const metadata: Metadata = { title: "Forms — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <FormsPage />; }
