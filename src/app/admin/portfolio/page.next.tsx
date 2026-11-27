import type { Metadata } from "next";
import PortfolioNext from "../Portfolio.next";

export const metadata: Metadata = { title: "Portfolio — Oni247 Admin", robots: { index: false, follow: false } };

export default function PortfolioPage() {
  return <PortfolioNext />;
}
