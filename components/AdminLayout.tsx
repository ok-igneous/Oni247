import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowLeft, Building2, LayoutGrid } from "lucide-react";
import styles from "./AdminLayout.module.css";

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/admin/businesses", label: "Businesses", icon: Building2, end: false },
];
   10	
   11	export const AdminLayout = ({ children }: { children: ReactNode }) => {
   12	  return (
   13	    <div className={styles.shell}>
   14	      <header className={styles.bar}>
   15	        <div className={styles.barTop}>
   16	          <span className={styles.brand}>Oniduka Admin</span>
   17	          <Link to="/dashboard" className={styles.back}>
   18	            <ArrowLeft size={14} />
   19	            My shop
   20	          </Link>
   21	        </div>
   22	        <nav className={styles.nav}>
   23	          {navItems.map((item) => (
   24	            <NavLink
   25	              key={item.to}
   26	              to={item.to}
   27	              end={item.end}
   28	              className={({ isActive }) =>
   29	                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
   30	              }
   31	            >
   32	              <item.icon size={15} />
   33	              {item.label}
   34	            </NavLink>
   35	          ))}
   36	        </nav>
   37	      </header>
   38	      <main className={styles.content}>{children}</main>
   39	    </div>
   40	  );
   41	};
