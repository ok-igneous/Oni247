import type { ReactNode } from "react";
import AdminShell from "./AdminShell.next";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
