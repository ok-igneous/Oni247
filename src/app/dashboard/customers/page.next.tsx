import type { Metadata } from "next";
import CustomersNext from "../Customers.next";

export const metadata: Metadata = { title: "Customers — Oni247", robots: { index: false, follow: false } };

export default function CustomersPage() {
  return <CustomersNext />;
}
