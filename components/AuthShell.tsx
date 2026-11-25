import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./AuthShell.module.css";

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  className?: string;
}

export const AuthShell = ({
  title,
  subtitle,
  children,
  footer,
  className,
}: Props) => {
  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      <div className={styles.card}>
        <Link to="/" className={styles.brand}>
          Oni247
        </Link>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        <div className={styles.body}>{children}</div>
        <div className={styles.footer}>{footer}</div>
      </div>
    </div>
  );
};