import type { Metadata } from "next";
import CategoriesPage from "../_components/dashboard.categories";

export const metadata: Metadata = { title: "Categories — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <CategoriesPage />; }
