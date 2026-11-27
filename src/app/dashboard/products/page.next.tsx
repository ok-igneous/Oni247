import type { Metadata } from "next";
import ProductsNext from "../Products.next";

export const metadata: Metadata = { title: "Products — Oni247", robots: { index: false, follow: false } };

export default function ProductsPage() {
  return <ProductsNext />;
}
