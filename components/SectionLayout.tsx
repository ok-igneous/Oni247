import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import styles from "./SectionLayout.module.css";

export type SectionItem = { id: string; label: string; hint?: string; icon?: ReactNode; badge?: string | number };

/** The active section is kept in the address (?s=…) so a refresh, a shared link and the back button all land in the same place. */
export const useSection = (items: SectionItem[], fallback?: string) => {
  const [params, setParams] = useSearchParams();
  const asked = params.get("s");
  const value = items.some((i) => i.id === asked) ? (asked as string) : (fallback ?? items[0]?.id ?? "");
  const setValue = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("s", id);
    setParams(next, { replace: true });
  };
  return [value, setValue] as const;
};

/** A menu of sections on the left (a scrolling row of pills on a phone) with the chosen section's content beside it. */
export const SectionLayout = ({ title, items, value, onChange, footer, children }: { title?: string; items: SectionItem[]; value: string; onChange: (id: string) => void; footer?: ReactNode; children: ReactNode }) => (
  <div className={styles.shell}>
    <nav className={styles.menu} aria-label={title ?? "Sections"}>
      {title && <p className={styles.menuTitle}>{title}</p>}
      {items.map((item) => (
        <button key={item.id} type="button" className={`${styles.item} ${item.id === value ? styles.itemActive : ""}`} aria-current={item.id === value ? "page" : undefined} onClick={() => onChange(item.id)}>
          {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
          <span className={styles.itemText}>
            <span className={styles.itemLabel}>{item.label}</span>
            {item.hint && <span className={styles.itemHint}>{item.hint}</span>}
          </span>
          {item.badge !== undefined && <span className={styles.itemBadge}>{item.badge}</span>}
        </button>
      ))}
      {footer && <div className={styles.menuFoot}>{footer}</div>}
    </nav>
    <div className={styles.panel}>{children}</div>
  </div>
);

