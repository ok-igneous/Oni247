"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Building2, CreditCard, LayoutGrid, Menu, PanelsTopLeft, Puzzle, Settings, UserRound, X } from "lucide-react";
import { useAuth } from "../../../helpers/useAuth";
import { AuthLoadingState } from "../../../components/AuthLoadingState";
import { AuthErrorPage } from "../../../components/AuthErrorPage";
import styles from "../../../components/AdminLayout.module.css";

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/admin/businesses", label: "Businesses", icon: Building2 },
  { to: "/admin/plans", label: "Plans", icon: CreditCard },
  { to: "/admin/addons", label: "Add-ons", icon: Puzzle },
  { to: "/admin/landing", label: "Landing page", icon: PanelsTopLeft },
  { to: "/admin/portfolio", label: "Portfolio", icon: UserRound },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShellNext({ children }: { children: ReactNode }) {
  const { authState } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (authState.type === "unauthenticated") router.replace("/login");
    if (authState.type === "authenticated" && !authState.user.emailVerifiedAt) router.replace("/verify-email");
  }, [authState, router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (authState.type === "loading" || authState.type === "unauthenticated") {
    return <AuthLoadingState title="Checking administrator access" />;
  }
  if (!authState.user.emailVerifiedAt) {
    return <AuthLoadingState title="Email verification required" />;
  }
  if (authState.user.role !== "admin") {
    return <AuthErrorPage title="Administrator access required" message="This area is restricted to Oni247 platform administrators." />;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <div className={styles.barTop}>
          <span className={styles.brand}>Oni247 Admin</span>
          <button type="button" className={styles.menuToggle} aria-label={menuOpen ? "Close admin menu" : "Open admin menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <Link href="/dashboard" className={styles.back}><ArrowLeft size={14} /> My shop</Link>
        </div>
        {menuOpen && <button type="button" className={styles.mobileBackdrop} aria-label="Close admin navigation" onClick={() => setMenuOpen(false)} />}
        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`} aria-label="Platform administration">
          {navItems.map(item => {
            const active = item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return <Link key={item.to} href={item.to} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined} className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}>
              <Icon size={15} />{item.label}
            </Link>;
          })}
        </nav>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
