import type { Metadata } from "next";
import CustomersPage from "../_components/dashboard.customers";

export const metadata: Metadata = { title: "Customers — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <CustomersPage />; }
