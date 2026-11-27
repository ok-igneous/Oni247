import type { Metadata } from "next";
import AddonsNext from "../Addons.next";

export const metadata: Metadata = { title: "Addons — Oni247 Admin", robots: { index: false, follow: false } };

export default function AddonsPage() {
  return <AddonsNext />;
}
