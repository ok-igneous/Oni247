import type { StoreTheme } from "../helpers/schema";
import styles from "./ThemePreview.module.css";

interface Props {
  theme: StoreTheme;
  className?: string;
}

/**
   10	 * A wireframe of what each theme's public page actually looks like, drawn from
   11	 * the design tokens. Not a screenshot — it cannot drift out of date, costs no
   12	 * storage, and loads instantly on a phone.
   13	 */
   14	export const ThemePreview = ({ theme, className }: Props) => {
   15	  return (
   16	    <svg
   17	      className={`${styles.preview} ${className ?? ""}`}
   18	      viewBox="0 0 120 84"
   19	      role="img"
   20	      aria-label={`${theme} theme layout preview`}
   21	    >
   22	      <rect className={styles.page} x="0" y="0" width="120" height="84" rx="3" />
   23	
   24	      {theme === "clean" && (
   25	        <>
   26	          <rect className={styles.band} x="0" y="0" width="120" height="20" />
   27	          <circle className={styles.mark} cx="12" cy="10" r="5" />
   28	          <rect className={styles.headline} x="21" y="6" width="34" height="4" rx="1" />
   29	          <rect className={styles.muted} x="21" y="12" width="52" height="2.5" rx="1" />
   30	          <rect className={styles.pill} x="94" y="6" width="18" height="7" rx="3.5" />
   31	          <rect className={styles.rule} x="0" y="24" width="120" height="0.8" />
   32	          {[8, 46, 84].map((x) => (
   33	            <g key={x}>
   34	              <rect className={styles.tile} x={x} y="32" width="28" height="20" rx="2" />
   35	              <rect className={styles.muted} x={x} y="55" width="20" height="2.5" rx="1" />
   36	              <rect className={styles.price} x={x} y="60" width="12" height="2.5" rx="1" />
   37	            </g>
   38	          ))}
   39	        </>
   40	      )}
   41	
   42	      {theme === "commerce" && (
   43	        <>
   44	          <rect className={styles.bandLight} x="0" y="0" width="120" height="14" />
   45	          <circle className={styles.mark} cx="10" cy="7" r="4" />
   46	          <rect className={styles.headline} x="18" y="5" width="26" height="3.5" rx="1" />
   47	          <rect className={styles.pill} x="98" y="3.5" width="14" height="6" rx="3" />
   48	          <rect className={styles.rule} x="0" y="17" width="120" height="0.8" />
   49	          {[6, 30, 54, 78].map((x) => (
   50	            <rect key={`a${x}`} className={styles.pillSmall} x={x} y="21" width="18" height="5" rx="2.5" />
   51	          ))}
   52	          {[6, 30, 54, 78].map((x) => (
   53	            <g key={`b${x}`}>
   54	              <rect className={styles.tile} x={x} y="31" width="20" height="15" rx="1.5" />
   55	              <rect className={styles.price} x={x} y="48" width="11" height="2.5" rx="1" />
   56	            </g>
   57	          ))}
   58	          {[6, 30, 54, 78].map((x) => (
   59	            <g key={`c${x}`}>
   60	              <rect className={styles.tile} x={x} y="55" width="20" height="15" rx="1.5" />
   61	              <rect className={styles.price} x={x} y="72" width="11" height="2.5" rx="1" />
   62	            </g>
   63	          ))}
   64	        </>
   65	      )}
   66	
   67	      {theme === "service" && (
   68	        <>
   69	          <rect className={styles.bandBold} x="0" y="0" width="120" height="26" />
   70	          <circle className={styles.markInverse} cx="14" cy="13" r="6.5" />
   71	          <rect className={styles.headlineInverse} x="26" y="8" width="42" height="5" rx="1" />
   72	          <rect className={styles.subInverse} x="26" y="16" width="58" height="3" rx="1" />
   73	          {[32, 50, 68].map((y) => (
   74	            <g key={y}>
   75	              <rect className={styles.row} x="8" y={y} width="104" height="14" rx="2" />
   76	              <rect className={styles.thumb} x="11" y={y + 2.5} width="9" height="9" rx="1.5" />
   77	              <rect className={styles.muted} x="24" y={y + 4} width="38" height="2.5" rx="1" />
   78	              <rect className={styles.mutedFaint} x="24" y={y + 8.5} width="52" height="2" rx="1" />
   79	              <rect className={styles.price} x="95" y={y + 5.5} width="13" height="3" rx="1" />
   80	            </g>
   81	          ))}
   82	        </>
   83	      )}
   84	    </svg>
   85	  );
   86	};
