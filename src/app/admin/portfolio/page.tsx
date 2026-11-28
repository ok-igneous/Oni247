import type { Metadata } from "next";
import PortfolioPage from "../_components/admin.portfolio";

export const metadata: Metadata = { title: "Portfolio — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <PortfolioPage />; }
