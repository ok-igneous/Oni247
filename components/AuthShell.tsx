import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./AuthShell.module.css";

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
   10	  className?: string;
   11	}
   12	
   13	export const AuthShell = ({
   14	  title,
   15	  subtitle,
   16	  children,
   17	  footer,
   18	  className,
   19	}: Props) => {
   20	  return (
   21	    <div className={`${styles.wrap} ${className ?? ""}`}>
   22	      <div className={styles.card}>
   23	        <Link to="/" className={styles.brand}>
   24	          Oniduka
   25	        </Link>
   26	        <h1 className={styles.title}>{title}</h1>
   27	        <p className={styles.subtitle}>{subtitle}</p>
   28	        <div className={styles.body}>{children}</div>
   29	        <div className={styles.footer}>{footer}</div>
   30	      </div>
   31	    </div>
   32	  );
   33	};
