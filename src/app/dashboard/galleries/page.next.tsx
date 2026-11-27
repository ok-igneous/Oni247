import type { Metadata } from "next";
import GalleriesNext from "../Galleries.next";

export const metadata: Metadata = { title: "Galleries — Oni247", robots: { index: false, follow: false } };

export default function GalleriesPage() {
  return <GalleriesNext />;
}
