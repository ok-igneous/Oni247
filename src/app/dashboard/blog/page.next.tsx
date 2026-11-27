import type { Metadata } from "next";
import BlogNext from "../Blog.next";

export const metadata: Metadata = { title: "Blog — Oni247", robots: { index: false, follow: false } };

export default function BlogPage() {
  return <BlogNext />;
}
