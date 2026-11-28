import type { Metadata } from "next";
import TeamPage from "../_components/dashboard.team";

export const metadata: Metadata = { title: "Team — Oni247", robots: { index: false, follow: false } };

export default function Page() { return <TeamPage />; }
