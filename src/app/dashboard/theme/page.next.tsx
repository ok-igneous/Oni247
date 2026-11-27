import type { Metadata } from "next";
import ThemeNext from "../Theme.next";

export const metadata: Metadata = { title: "Appearance — Oni247", robots: { index: false, follow: false } };

export default function ThemePage() {
  return <ThemeNext />;
}
