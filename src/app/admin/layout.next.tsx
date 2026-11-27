import type { ReactNode } from "react";
import { AdminShellNext } from "./AdminShell.next";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShellNext>{children}</AdminShellNext>;
}
