import type { Metadata } from "next";
import CommentsPage from "../_components/dashboard.comments";

export const metadata: Metadata = { title: "Comments — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <CommentsPage />; }
