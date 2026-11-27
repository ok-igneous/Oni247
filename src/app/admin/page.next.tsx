import type { Metadata } from "next";
import AdminOverviewNext from "./AdminOverview.next";

export const metadata: Metadata = { title: "Admin — Oni247", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <AdminOverviewNext />;
}
