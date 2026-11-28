import type { Metadata } from "next";
import AdminPage from "./_components/admin";

export const metadata: Metadata = { title: "Admin — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <AdminPage />; }
