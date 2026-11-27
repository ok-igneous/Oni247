import type { Metadata } from "next";
import FormsNext from "../Forms.next";

export const metadata: Metadata = { title: "Forms — Oni247", robots: { index: false, follow: false } };

export default function FormsPage() {
  return <FormsNext />;
}
