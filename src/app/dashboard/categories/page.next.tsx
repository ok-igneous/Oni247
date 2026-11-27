import type { Metadata } from "next";
import CategoriesNext from "../Categories.next";

export const metadata: Metadata = { title: "Categories — Oni247", robots: { index: false, follow: false } };

export default function CategoriesPage() {
  return <CategoriesNext />;
}
