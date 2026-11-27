import type { Metadata } from "next";
import OrdersNext from "../Orders.next";

export const metadata: Metadata = { title: "Orders — Oni247", robots: { index: false, follow: false } };

export default function OrdersPage() {
  return <OrdersNext />;
}
