import type { Metadata } from "next";
import TeamNext from "../Team.next";

export const metadata: Metadata = { title: "Team — Oni247", robots: { index: false, follow: false } };

export default function TeamPage() {
  return <TeamNext />;
}
