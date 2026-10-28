import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  CreditCard,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
  FolderTree,
   10	  Inbox,
   11	  LayoutGrid,
   12	  LogOut,
   13	  Package,
   14	  Receipt,
   15	  Share2,
   16	  ShieldCheck,
   17	  Sparkles,
   18	  Store,
   19	} from "lucide-react";
   20	import { Button } from "./Button";
   21	import { useEffect, useState } from "react";
   22	import { useAuth } from "../helpers/useAuth";
   23	import { useMyBusiness } from "../helpers/useMyBusiness";
   24	import styles from "./DashboardLayout.module.css";
   25	
   26	const navItems = [
   27	  { to: "/dashboard", label: "Overview", icon: LayoutGrid, end: true },
   28	  { to: "/dashboard/business", label: "Business", icon: Store, end: false },
   29	  { to: "/dashboard/presence", label: "Presence", icon: Sparkles, end: false },
   30	  { to: "/dashboard/theme", label: "Theme", icon: Sparkles, end: false },
   31	  { to: "/dashboard/galleries", label: "Gallery", icon: Sparkles, end: false },
   32	  { to: "/dashboard/blog", label: "Blog", icon: Sparkles, end: false },
   33	  { to: "/dashboard/services", label: "Services", icon: Sparkles, end: false },
   34	  { to: "/dashboard/products", label: "Products", icon: Package, end: false },
   35	  {
   36	    to: "/dashboard/categories",
   37	    label: "Categories",
   38	    icon: FolderTree,
   39	    end: false,
   40	  },
   41	  { to: "/dashboard/orders", label: "Orders", icon: Receipt, end: false },
   42	  { to: "/dashboard/enquiries", label: "Enquiries", icon: Inbox, end: false },
   43	  { to: "/dashboard/share", label: "Share", icon: Share2, end: false },
   44	  { to: "/dashboard/reports", label: "Reports", icon: Receipt, end: false },
   45	  { to: "/dashboard/traffic", label: "Traffic", icon: BarChart3, end: false },
   46	  { to: "/dashboard/plan", label: "Plan", icon: CreditCard, end: false },
   47	];
   48	
   49	export const DashboardLayout = ({ children }: { children: ReactNode }) => {
   50	  const { logout, authState } = useAuth();
   51	  const { data } = useMyBusiness();
   52	  const location = useLocation();
   53	  const isThemeRoute = location.pathname === "/dashboard/theme";
   54	  const [themeSidebarCollapsed, setThemeSidebarCollapsed] = useState(() => {
   55	    if (typeof window === "undefined") return false;
   56	    return window.localStorage.getItem("oniduka-theme-sidebar-collapsed") === "true";
   57	  });
   58	  useEffect(() => {
   59	    if (typeof window !== "undefined") {
   60	      window.localStorage.setItem("oniduka-theme-sidebar-collapsed", String(themeSidebarCollapsed));
   61	    }
   62	  }, [themeSidebarCollapsed]);
   63	  const business = data?.business ?? null;
   64	  const isPublished = business?.status === "published";
   65	  const isAdmin =
   66	    authState.type === "authenticated" && authState.user.role === "admin";
   67	
   68	  return (
   69	    <div className={`${styles.shell} ${isThemeRoute ? styles.shellTheme : ""}`}>
   70	      <aside className={`${styles.sidebar} ${isThemeRoute && themeSidebarCollapsed ? styles.sidebarCollapsed : ""}`}>
   71	        <div className={styles.sidebarTop}>
   72	          <Link to="/" className={styles.brand} aria-label="Oniduka home">
   73	            {isThemeRoute && themeSidebarCollapsed ? "O" : "Oniduka"}
   74	          </Link>
   75	          {business && !(isThemeRoute && themeSidebarCollapsed) && (
   76	            <span className={styles.businessLabel}>{business.name}</span>
   77	          )}
   78	          {isThemeRoute && (
   79	            <Button
   80	              variant="ghost"
   81	              size="sm"
   82	              className={styles.themeCollapseToggle}
   83	              aria-label={themeSidebarCollapsed ? "Expand dashboard menu" : "Collapse dashboard menu"}
   84	              title={themeSidebarCollapsed ? "Expand menu" : "Collapse menu"}
   85	              onClick={() => setThemeSidebarCollapsed((collapsed) => !collapsed)}
   86	            >
   87	              {themeSidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
   88	            </Button>
   89	          )}
   90	        </div>
   91	
   92	        <nav className={styles.nav}>
   93	          {navItems.map((item) => (
   94	            <NavLink
   95	              key={item.to}
   96	              to={item.to}
   97	              end={item.end}
   98	              className={({ isActive }) =>
   99	                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
  100	              }
  101	            >
  102	              <item.icon size={16} />
  103	              <span>{item.label}</span>
  104	            </NavLink>
  105	          ))}
  106	        </nav>
  107	
  108	        <div className={styles.sidebarBottom}>
  109	          {isAdmin && (
  110	            <Button asChild variant="outline" size="sm" className={styles.fullWidth}>
  111	              <Link to="/admin">
  112	                <ShieldCheck size={15} />
  113	                <span>Admin</span>
  114	              </Link>
  115	            </Button>
  116	          )}
  117	          {business && isPublished && (
  118	            <Button asChild variant="outline" size="sm" className={styles.fullWidth}>
  119	              <a
  120	                href={`/store/${business.slug}`}
  121	                target="_blank"
  122	                rel="noopener noreferrer"
  123	              >
  124	                <ExternalLink size={15} />
  125	                <span>View page</span>
  126	              </a>
  127	            </Button>
  128	          )}
  129	          <Button
  130	            variant="ghost"
  131	            size="sm"
  132	            className={styles.fullWidth}
  133	            onClick={() => {
  134	              void logout();
  135	            }}
  136	          >
  137	            <LogOut size={15} />
  138	            <span>Log out</span>
  139	          </Button>
  140	        </div>
  141	      </aside>
  142	
  143	      <main className={`${styles.content} ${isThemeRoute ? styles.contentTheme : ""}`}>{children}</main>
  144	    </div>
  145	  );
  146	};
