import type { ReactNode } from "react";
import { DashboardShellNext } from "./DashboardShell.next";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShellNext>{children}</DashboardShellNext>;
}
