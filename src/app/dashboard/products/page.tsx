import type { Metadata } from "next";
import ProductsPage from "../_components/dashboard.products";

export const metadata: Metadata = { title: "Products — Oni247", robots: { index: false, follow: false } };

export default function Page() {
  return <ProductsPage />;
}
