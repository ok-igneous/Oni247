import type { Metadata } from "next";
import ShareNext from "../Share.next";

export const metadata: Metadata = { title: "Share — Oni247", robots: { index: false, follow: false } };

export default function SharePage() {
  return <ShareNext />;
}
