import type { ReactNode } from "react";
import styles from "./Panel.module.css";

export const PageHead = ({ title, lead }: { title: string; lead?: string }) => (
  <header className={styles.pageHead}>
    <h1 className={styles.pageTitle}>{title}</h1>
    {lead && <p className={styles.pageLead}>{lead}</p>}
  </header>
);

export const Panel = ({ title, desc, actions, footer, children }: { title?: string; desc?: string; actions?: ReactNode; footer?: ReactNode; children: ReactNode }) => (
  <section className={styles.panel}>
    {(title || actions) && (
      <div className={styles.head}>
        <div>
          {title && <h2 className={styles.title}>{title}</h2>}
          {desc && <p className={styles.desc}>{desc}</p>}
        </div>
        {actions && <div className={styles.headActions}>{actions}</div>}
      </div>
    )}
    <div className={styles.body}>{children}</div>
    {footer && <div className={styles.foot}>{footer}</div>}
  </section>
);

export const Fields = ({ children }: { children: ReactNode }) => <div className={styles.fields}>{children}</div>;

export const Field = ({ label, hint, full, children }: { label: string; hint?: string; full?: boolean; children: ReactNode }) => (
  <label className={`${styles.field} ${full ? styles.full : ""}`}>
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

