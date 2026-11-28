import type { Metadata } from "next";
import OrdersPage from "../_components/dashboard.orders";

export const metadata: Metadata = { title: "Orders — Oni247", robots: { index: false, follow: false } };

export default function Page() {
  return <OrdersPage />;
}
