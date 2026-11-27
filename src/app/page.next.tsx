import type { Metadata } from "next";
import { HomePageNext } from "./_components/HomePage.next";

export const metadata: Metadata = {
  title: "Oni247 — Your business, online and ready to grow",
  description: "Create a professional online presence for your business. Share products and services, receive enquiries and orders, and track simple business performance with Oni247.",
};

export default function HomePage() {
  return <HomePageNext />;
}
