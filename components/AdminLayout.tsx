import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowLeft, Building2, CreditCard, LayoutGrid, Menu, PanelsTopLeft, Puzzle, Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./AdminLayout.module.css";

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/admin/businesses", label: "Businesses", icon: Building2, end: false },
  { to: "/admin/plans", label: "Plans", icon: CreditCard, end: false },
  { to: "/admin/addons", label: "Add-ons", icon: Puzzle, end: false },
  { to: "/admin/landing", label: "Landing page", icon: PanelsTopLeft, end: false },
  { to: "/admin/settings", label: "Settings", icon: Settings, end: false },
];

export const AdminLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [location.pathname]);
  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <div className={styles.barTop}>
          <span className={styles.brand}>Oni247 Admin</span><button type="button" className={styles.menuToggle} aria-label={menuOpen ? "Close admin menu" : "Open admin menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={21}/> : <Menu size={21}/>}</button>
          <Link to="/dashboard" className={styles.back}>
            <ArrowLeft size={14} />
            My shop
          </Link>
        </div>
        {menuOpen && <button type="button" className={styles.mobileBackdrop} aria-label="Close admin navigation" onClick={() => setMenuOpen(false)} />}
        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
              }
            >
              <item.icon size={15} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
};
