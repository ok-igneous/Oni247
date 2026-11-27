import type { Metadata } from "next";
import CommentsNext from "../Comments.next";

export const metadata: Metadata = { title: "Comments — Oni247", robots: { index: false, follow: false } };

export default function CommentsPage() {
  return <CommentsNext />;
}
