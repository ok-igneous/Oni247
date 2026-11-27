import type { Metadata } from "next";
import MediaNext from "../Media.next";

export const metadata: Metadata = { title: "Media — Oni247", robots: { index: false, follow: false } };

export default function MediaPage() {
  return <MediaNext />;
}
