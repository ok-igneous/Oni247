import type { Metadata } from "next";
import BlogPage from "../_components/dashboard.blog";

export const metadata: Metadata = { title: "Blog — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <BlogPage />; }
