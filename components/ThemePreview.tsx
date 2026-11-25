import type { StoreTheme } from "../helpers/schema";
import styles from "./ThemePreview.module.css";

interface Props {
  theme: StoreTheme;
  className?: string;
}

/**
 * A wireframe of what each theme's public page actually looks like, drawn from
 * the design tokens. Not a screenshot — it cannot drift out of date, costs no
 * storage, and loads instantly on a phone.
 */
export const ThemePreview = ({ theme, className }: Props) => {
  return (
    <svg
      className={`${styles.preview} ${className ?? ""}`}
      viewBox="0 0 120 84"
      role="img"
      aria-label={`${theme} theme layout preview`}
    >
      <rect className={styles.page} x="0" y="0" width="120" height="84" rx="3" />

      {theme === "clean" && (
        <>
          <rect className={styles.band} x="0" y="0" width="120" height="20" />
          <circle className={styles.mark} cx="12" cy="10" r="5" />
          <rect className={styles.headline} x="21" y="6" width="34" height="4" rx="1" />
          <rect className={styles.muted} x="21" y="12" width="52" height="2.5" rx="1" />
          <rect className={styles.pill} x="94" y="6" width="18" height="7" rx="3.5" />
          <rect className={styles.rule} x="0" y="24" width="120" height="0.8" />
          {[8, 46, 84].map((x) => (
            <g key={x}>
              <rect className={styles.tile} x={x} y="32" width="28" height="20" rx="2" />
              <rect className={styles.muted} x={x} y="55" width="20" height="2.5" rx="1" />
              <rect className={styles.price} x={x} y="60" width="12" height="2.5" rx="1" />
            </g>
          ))}
        </>
      )}

      {theme === "commerce" && (
        <>
          <rect className={styles.bandLight} x="0" y="0" width="120" height="14" />
          <circle className={styles.mark} cx="10" cy="7" r="4" />
          <rect className={styles.headline} x="18" y="5" width="26" height="3.5" rx="1" />
          <rect className={styles.pill} x="98" y="3.5" width="14" height="6" rx="3" />
          <rect className={styles.rule} x="0" y="17" width="120" height="0.8" />
          {[6, 30, 54, 78].map((x) => (
            <rect key={`a${x}`} className={styles.pillSmall} x={x} y="21" width="18" height="5" rx="2.5" />
          ))}
          {[6, 30, 54, 78].map((x) => (
            <g key={`b${x}`}>
              <rect className={styles.tile} x={x} y="31" width="20" height="15" rx="1.5" />
              <rect className={styles.price} x={x} y="48" width="11" height="2.5" rx="1" />
            </g>
          ))}
          {[6, 30, 54, 78].map((x) => (
            <g key={`c${x}`}>
              <rect className={styles.tile} x={x} y="55" width="20" height="15" rx="1.5" />
              <rect className={styles.price} x={x} y="72" width="11" height="2.5" rx="1" />
            </g>
          ))}
        </>
      )}

      {theme === "service" && (
        <>
          <rect className={styles.bandBold} x="0" y="0" width="120" height="26" />
          <circle className={styles.markInverse} cx="14" cy="13" r="6.5" />
          <rect className={styles.headlineInverse} x="26" y="8" width="42" height="5" rx="1" />
          <rect className={styles.subInverse} x="26" y="16" width="58" height="3" rx="1" />
          {[32, 50, 68].map((y) => (
            <g key={y}>
              <rect className={styles.row} x="8" y={y} width="104" height="14" rx="2" />
              <rect className={styles.thumb} x="11" y={y + 2.5} width="9" height="9" rx="1.5" />
              <rect className={styles.muted} x="24" y={y + 4} width="38" height="2.5" rx="1" />
              <rect className={styles.mutedFaint} x="24" y={y + 8.5} width="52" height="2" rx="1" />
              <rect className={styles.price} x="95" y={y + 5.5} width="13" height="3" rx="1" />
            </g>
          ))}
        </>
      )}
    </svg>
  );
};