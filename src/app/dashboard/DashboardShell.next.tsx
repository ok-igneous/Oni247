"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3, CalendarDays, ChevronDown, ChevronRight, ClipboardList,
  CreditCard, ExternalLink, FileText, FolderTree, Images, Inbox,
  LayoutGrid, LogOut, Mail, Menu, MessageSquare, Package,
  Puzzle, Receipt, Share2, ShieldCheck, Sparkles, Store, Truck, Users,
  UserCog, X, Palette, Globe, Settings2,
} from "lucide-react";
import { Button } from "../../../components/Button";
import { useAuth } from "../../../helpers/useAuth";
import { useMyBusiness } from "../../../helpers/useMyBusiness";
import { useTeamAccess } from "../../../helpers/useTeam";
import { addonByNavLabel, isAddonEnabled } from "../../../helpers/addons";
import { canSeeMenu } from "../../../helpers/permissions";
import { AuthLoadingState } from "../../../components/AuthLoadingState";
import { AuthErrorPage } from "../../../components/AuthErrorPage";
import styles from "../../../components/DashboardLayout.module.css";

type NavItem = { to: string; label: string; icon: typeof LayoutGrid; end?: boolean };
type NavGroup = { id: string; label: string; icon: typeof LayoutGrid; items: NavItem[] };

const overview: NavItem = { to: "/dashboard", label: "Overview", icon: LayoutGrid, end: true };
const navGroups: NavGroup[] = [
  { id: "content", label: "Content", icon: FileText, items: [
    { to: "/dashboard/blog", label: "Blog", icon: FileText },
    { to: "/dashboard/media", label: "Media library", icon: Images },
    { to: "/dashboard/galleries", label: "Gallery", icon: Images },
    { to: "/dashboard/services", label: "Services", icon: Sparkles },
    { to: "/dashboard/events", label: "Events", icon: CalendarDays },
    { to: "/dashboard/forms", label: "Forms", icon: ClipboardList },
    { to: "/dashboard/comments", label: "Comments", icon: MessageSquare },
  ]},
  { id: "appearance", label: "Appearance", icon: Palette, items: [
    { to: "/dashboard/theme", label: "Theme", icon: Palette },
  ]},
  { id: "site", label: "Domain & SEO", icon: Globe, items: [
    { to: "/dashboard/business", label: "Business & publishing", icon: Store },
    { to: "/dashboard/theme?tab=seo", label: "SEO & sharing", icon: Globe },
  ]},
  { id: "commerce", label: "Store & orders", icon: Package, items: [
    { to: "/dashboard/products", label: "Products", icon: Package },
    { to: "/dashboard/categories", label: "Categories", icon: FolderTree },
    { to: "/dashboard/orders", label: "Orders", icon: Receipt },
    { to: "/dashboard/checkout", label: "Delivery & payment", icon: Truck },
    { to: "/dashboard/payments", label: "Payments", icon: CreditCard },
  ]},
  { id: "customers", label: "Customers & communication", icon: Users, items: [
    { to: "/dashboard/customers", label: "Customers", icon: Users },
    { to: "/dashboard/enquiries", label: "Enquiries", icon: Inbox },
    { to: "/dashboard/email", label: "Email", icon: Mail },
    { to: "/dashboard/share", label: "Share", icon: Share2 },
  ]},
  { id: "insights", label: "Reports & insights", icon: BarChart3, items: [
    { to: "/dashboard/reports", label: "Reports", icon: BarChart3 },
    { to: "/dashboard/traffic", label: "Traffic", icon: BarChart3 },
  ]},
  { id: "account", label: "Account & tools", icon: Settings2, items: [
    { to: "/dashboard/addons", label: "Add-ons", icon: Puzzle },
    { to: "/dashboard/team", label: "Team", icon: UserCog },
    { to: "/dashboard/plan", label: "Plan", icon: CreditCard },
  ]},
];

function DashboardRouteGuard({ children }: { children: ReactNode }) {
  const { authState } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authState.type === "unauthenticated") router.replace("/login");
    if (authState.type === "authenticated" && !authState.user.emailVerifiedAt) router.replace("/verify-email");
  }, [authState, router]);

  if (authState.type === "loading" || authState.type === "unauthenticated") {
    return <AuthLoadingState title="Checking your account" />;
  }
  if (!authState.user.emailVerifiedAt) return <AuthLoadingState title="Email verification required" />;
  if (!["user", "admin"].includes(authState.user.role)) {
    return <AuthErrorPage title="Access denied" message="Your account does not have permission to open this dashboard." />;
  }
  return <>{children}</>;
}

function DashboardNavigation({ children }: { children: ReactNode }) {
  const { logout, authState } = useAuth();
  const { data } = useMyBusiness();
  const { data: access } = useTeamAccess();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    content: true, appearance: true, site: true,
  });

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);
  useEffect(() => {
    const activeGroup = navGroups.find(group => group.items.some(item => {
      const [path, query] = item.to.split("?");
      if (pathname !== path) return false;
      if (!query) return !searchParams.toString();
      const [key, value] = query.split("=");
      return searchParams.get(key) === value;
    }));
    if (activeGroup) setExpandedGroups(current => ({ ...current, [activeGroup.id]: true }));
  }, [pathname, searchParams]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("oni247-dashboard-nav-groups");
      if (saved) setExpandedGroups(JSON.parse(saved) as Record<string, boolean>);
    } catch { /* Keep the safe default navigation state. */ }
  }, []);
  useEffect(() => {
    window.localStorage.setItem("oni247-dashboard-nav-groups", JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const business = data?.business ?? null;
  const appearance = business?.appearanceSettings && typeof business.appearanceSettings === "object"
    ? business.appearanceSettings as Record<string, unknown> : null;
  const siteType = appearance?.siteType ?? "custom";
  const hiddenBySiteType: Record<string, string[]> = {
    online_store: ["Blog", "Events", "Forms", "Comments"],
    service_business: ["Categories", "Products", "Orders", "Customers", "Delivery & payment", "Events", "Forms"],
    portfolio: ["Categories", "Products", "Orders", "Customers", "Delivery & payment", "Events", "Forms"],
    events_community: ["Categories", "Products", "Orders", "Customers", "Delivery & payment", "Services"],
  };
  const visibleGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      const menuPath = item.to.split("?")[0].replace("/dashboard", "").replace(/^\//, "");
      if (menuPath && !canSeeMenu(menuPath, access?.isOwner === true, access?.permissions ?? [])) return false;
      const addon = addonByNavLabel(item.label);
      if (addon && !isAddonEnabled(appearance, addon)) return false;
      return !(hiddenBySiteType[String(siteType)] ?? []).includes(item.label);
    }),
  })).filter(group => group.items.length > 0);
  const isPublished = business?.status === "published";
  const isAdmin = authState.type === "authenticated" && authState.user.role === "admin";

  const renderNavItem = (item: NavItem) => {
    const path = item.to.split("?")[0];
    const query = item.to.split("?")[1];
    const queryMatches = query
      ? (() => { const [key, value] = query.split("="); return searchParams.get(key) === value; })()
      : !searchParams.toString();
    const active = pathname === path && queryMatches;
    const Icon = item.icon;
    return <Link key={item.to} href={item.to} onClick={() => setMobileMenuOpen(false)}
      aria-current={active ? "page" : undefined}
      className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}>
      <Icon size={17} strokeWidth={1.9} /><span>{item.label}</span>
    </Link>;
  };

  return (
    <div className={styles.shell}>
      <div className={styles.mobileBar}>
        <Link href="/dashboard" className={styles.mobileBrand}>Oni247</Link>
        <button type="button" className={styles.mobileToggle}
          aria-label={mobileMenuOpen ? "Close dashboard menu" : "Open dashboard menu"}
          aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(value => !value)}>
          {mobileMenuOpen ? <X size={22}/> : <Menu size={22}/>}
        </button>
      </div>
      {mobileMenuOpen && <button type="button" className={styles.mobileBackdrop}
        aria-label="Close dashboard menu" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarTop}>
          <Link href="/" className={styles.brand} aria-label="Oni247 home">Oni247</Link>
          {business && <span className={styles.businessLabel}>{business.name}</span>}
        </div>
        <nav className={styles.nav} aria-label="Dashboard navigation">
          {renderNavItem(overview)}
          {visibleGroups.map(group => {
            const active = group.items.some(item => {
              const [path, query] = item.to.split("?");
              if (pathname !== path) return false;
              if (!query) return !searchParams.toString();
              const [key, value] = query.split("=");
              return searchParams.get(key) === value;
            });
            const expanded = Boolean(expandedGroups[group.id]);
            const Icon = group.icon;
            return <section className={styles.navGroup} key={group.id}>
              <button type="button" className={`${styles.groupToggle} ${active ? styles.groupToggleActive : ""}`}
                aria-expanded={expanded} onClick={() => setExpandedGroups(current => ({...current, [group.id]: !expanded}))}>
                <Icon size={16}/><span>{group.label}</span>{expanded ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
              </button>
              {expanded && <div className={styles.groupItems}>{group.items.map(renderNavItem)}</div>}
            </section>;
          })}
        </nav>
        <div className={styles.sidebarBottom}>
          {isAdmin && <Button asChild variant="outline" size="md" className={styles.fullWidth}>
            <Link href="/admin"><ShieldCheck size={15}/><span>Admin</span></Link>
          </Button>}
          {business && isPublished && <Button asChild variant="outline" size="md" className={styles.fullWidth}>
            <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/><span>View page</span></a>
          </Button>}
          <Button variant="ghost" size="md" className={styles.fullWidth} onClick={() => { void logout(); }}>
            <LogOut size={15}/><span>Log out</span>
          </Button>
        </div>
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
  );
}

export function DashboardShellNext({ children }: { children: ReactNode }) {
  return <DashboardRouteGuard><Suspense fallback={<AuthLoadingState title="Loading dashboard" />}><DashboardNavigation>{children}</DashboardNavigation></Suspense></DashboardRouteGuard>;
}
