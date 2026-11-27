import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  CreditCard,
  CalendarDays,
  ClipboardList,
  Images,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ExternalLink,
  FolderTree,
  Globe2,
  Inbox,
  LayoutGrid,
  LogOut,
  Package,
  Receipt,
  Share2,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Users,
  MessageSquare,
  Mail,
  Puzzle,
  UserCog,
} from "lucide-react";
import { Button } from "./Button";
import { useEffect, useState } from "react";
import { useAuth } from "../helpers/useAuth";
import { useMyBusiness } from "../helpers/useMyBusiness";
import { addonByNavLabel, isAddonEnabled } from "../helpers/addons";
import { useTeamAccess } from "../helpers/useTeam";
import { canSeeMenu } from "../helpers/permissions";
import styles from "./DashboardLayout.module.css";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/dashboard/business", label: "Business", icon: Store, end: false },
  { to: "/dashboard/domains", label: "Domains", icon: Globe2, end: false },
  { to: "/dashboard/presence", label: "Presence", icon: Sparkles, end: false },
  { to: "/dashboard/theme", label: "Theme", icon: Sparkles, end: false },
  { to: "/dashboard/galleries", label: "Gallery", icon: Sparkles, end: false },
  { to: "/dashboard/blog", label: "Blog", icon: Sparkles, end: false },
  { to: "/dashboard/services", label: "Services", icon: Sparkles, end: false },
  { to: "/dashboard/events", label: "Events", icon: CalendarDays, end: false },
  { to: "/dashboard/forms", label: "Forms", icon: ClipboardList, end: false },
  { to: "/dashboard/media", label: "Media Library", icon: Images, end: false },
  { to: "/dashboard/products", label: "Products", icon: Package, end: false },
  {
    to: "/dashboard/categories",
    label: "Categories",
    icon: FolderTree,
    end: false,
  },
  { to: "/dashboard/orders", label: "Orders", icon: Receipt, end: false },
  { to: "/dashboard/customers", label: "Customers", icon: Users, end: false },
  { to: "/dashboard/checkout", label: "Delivery & payment", icon: Truck, end: false },
  { to: "/dashboard/payments", label: "Payments", icon: CreditCard, end: false },
  { to: "/dashboard/enquiries", label: "Enquiries", icon: Inbox, end: false },
  { to: "/dashboard/comments", label: "Comments", icon: MessageSquare, end: false },
  { to: "/dashboard/email", label: "Email", icon: Mail, end: false },
  { to: "/dashboard/share", label: "Share", icon: Share2, end: false },
  { to: "/dashboard/reports", label: "Reports", icon: Receipt, end: false },
  { to: "/dashboard/traffic", label: "Traffic", icon: BarChart3, end: false },
  { to: "/dashboard/addons", label: "Add-ons", icon: Puzzle, end: false },
  { to: "/dashboard/team", label: "Team", icon: UserCog, end: false },
  { to: "/dashboard/plan", label: "Plan", icon: CreditCard, end: false },
];

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { logout, authState } = useAuth();
  const { data } = useMyBusiness();
  const { data: access } = useTeamAccess();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);
  const isThemeRoute = location.pathname === "/dashboard/theme";
  const [themeSidebarCollapsed, setThemeSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("oniduka-theme-sidebar-collapsed") === "true";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("oniduka-theme-sidebar-collapsed", String(themeSidebarCollapsed));
    }
  }, [themeSidebarCollapsed]);
  const business = data?.business ?? null;
  const siteType = business?.appearanceSettings && typeof business.appearanceSettings === "object" ? (business.appearanceSettings as Record<string, unknown>).siteType : "custom";
  const hiddenBySiteType: Record<string, string[]> = {
    online_store: ["Blog", "Events", "Forms", "Comments"],
    service_business: ["Categories", "Products", "Orders", "Customers", "Delivery & payment", "Events", "Forms"],
    portfolio: ["Categories", "Products", "Orders", "Customers", "Delivery & payment", "Events", "Forms"],
    events_community: ["Categories", "Products", "Orders", "Customers", "Delivery & payment", "Services"],
  };
  const appearance = business?.appearanceSettings && typeof business.appearanceSettings === "object" ? (business.appearanceSettings as Record<string, unknown>) : null;
  const visibleNavItems = navItems.filter(item => {
    const menuPath = item.to.replace("/dashboard", "").replace(/^\//, "");
    if (menuPath && !canSeeMenu(menuPath, access?.isOwner ?? true, access?.permissions ?? [])) return false;
    const addon = addonByNavLabel(item.label);
    if (addon) return isAddonEnabled(appearance, addon);
    return !(hiddenBySiteType[String(siteType)] ?? []).includes(item.label);
  });
  const isPublished = business?.status === "published";
  const isAdmin =
    authState.type === "authenticated" && authState.user.role === "admin";

  return (
    <div className={`${styles.shell} ${isThemeRoute ? styles.shellTheme : ""}`}>
      <div className={styles.mobileBar}><Link to="/dashboard" className={styles.mobileBrand}>Oni247</Link><button type="button" className={styles.mobileToggle} aria-label={mobileMenuOpen ? "Close dashboard menu" : "Open dashboard menu"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(value => !value)}>{mobileMenuOpen ? <X size={22}/> : <Menu size={22}/>}</button></div>
      {mobileMenuOpen && <button type="button" className={styles.mobileBackdrop} aria-label="Close dashboard menu" onClick={() => setMobileMenuOpen(false)}/>}
      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ""} ${isThemeRoute && themeSidebarCollapsed ? styles.sidebarCollapsed : ""}`}>
        <div className={styles.sidebarTop}>
          <Link to="/" className={styles.brand} aria-label="Oni247 home">
            {isThemeRoute && themeSidebarCollapsed ? "O" : "Oni247"}
          </Link>
          {business && !(isThemeRoute && themeSidebarCollapsed) && (
            <span className={styles.businessLabel}>{business.name}</span>
          )}
          {isThemeRoute && (
            <Button
              variant="ghost"
              size="sm"
              className={styles.themeCollapseToggle}
              aria-label={themeSidebarCollapsed ? "Expand dashboard menu" : "Collapse dashboard menu"}
              title={themeSidebarCollapsed ? "Expand menu" : "Collapse menu"}
              onClick={() => setThemeSidebarCollapsed((collapsed) => !collapsed)}
            >
              {themeSidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </Button>
          )}
        </div>

        <nav className={styles.nav}>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              end={item.end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
              }
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          {isAdmin && (
            <Button asChild variant="outline" size="sm" className={styles.fullWidth}>
              <Link to="/admin">
                <ShieldCheck size={15} />
                <span>Admin</span>
              </Link>
            </Button>
          )}
          {business && isPublished && (
            <Button asChild variant="outline" size="sm" className={styles.fullWidth}>
              <a
                href={data?.primaryDomain
                  ? `https://${data.primaryDomain}`
                  : data?.platformWildcardReady && data.platformRootDomain
                    ? `https://${business.slug}.${data.platformRootDomain}`
                    : `/${business.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={15} />
                <span>View page</span>
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={styles.fullWidth}
            onClick={() => {
              void logout();
            }}
          >
            <LogOut size={15} />
            <span>Log out</span>
          </Button>
        </div>
      </aside>

      <main className={`${styles.content} ${isThemeRoute ? styles.contentTheme : ""}`}>{children}</main>
    </div>
  );
};
