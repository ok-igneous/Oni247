import type { Metadata } from "next";
import CheckoutPage from "../_components/dashboard.checkout";

export const metadata: Metadata = { title: "Checkout — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <CheckoutPage />; }
