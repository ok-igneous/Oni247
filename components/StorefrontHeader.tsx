import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, MessageCircle, Phone, ShoppingBag, X } from "lucide-react";
import { Button } from "./Button";
import styles from "./StorefrontHeader.module.css";
import { useStorefrontHost } from "../helpers/storefrontHost";

type StorefrontNavItem = { label: string; href: string; active?: boolean };
type StorefrontHeaderProps = {
  businessName: string;
  logoUrl?: string | null;
  tagline?: string;
  headerBrand?: string;
  headerAlignment?: string;
  navItems: StorefrontNavItem[];
  whatsappUrl?: string;
  phone?: string | null;
  showActions?: boolean;
  menuStyle?: "bar" | "pills" | "minimal";
  menuPosition?: "left" | "center" | "right";
  menuVisibility?: "auto" | "always";
  navVisible?: boolean;
  cartCount?: number;
  onCartClick?: () => void;
};

export const StorefrontHeader = ({ businessName, logoUrl, tagline, headerBrand = "logo_name", headerAlignment = "split", navItems, whatsappUrl, phone, showActions = true, menuStyle = "bar", menuPosition = "center", menuVisibility = "always", navVisible = true, cartCount, onCartClick }: StorefrontHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navId = useId();
  const host = useStorefrontHost();
  const navHref = (href: string) => host.slug && href.startsWith(`/${host.slug}/`)
    ? href.slice(host.slug.length + 1)
    : host.slug && href === `/${host.slug}` ? "/" : href;

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);
  const showLogo = headerBrand === "logo" || headerBrand === "logo_name" || headerBrand === "logo_name_tagline";
  const showName = headerBrand !== "logo";
  const showTagline = Boolean(tagline) && (headerBrand === "logo" || headerBrand === "logo_name_tagline" || headerBrand === "name_tagline");

  return (
    <header className={styles.header} id="home">
      <div className={`${styles.inner} ${headerAlignment === "center" ? styles.centered : ""}`}>
        <div className={styles.topRow}>
          <div className={styles.identity}>
            {showLogo && <div className={styles.logo}>{logoUrl ? <img src={logoUrl} alt={`${businessName} logo`} /> : businessName.charAt(0)}</div>}
            {showName && <div className={styles.identityText}><strong className={styles.name}>{businessName}</strong>{showTagline && <span className={styles.tagline}>{tagline}</span>}</div>}
            {!showName && showTagline && <span className={styles.tagline}>{tagline}</span>}
          </div>
          <div className={styles.actions}>
            {typeof cartCount === "number" && onCartClick && <button type="button" className={styles.cartButton} onClick={onCartClick} aria-label={`Open cart, ${cartCount} items`}><ShoppingBag size={19}/><span>{cartCount}</span></button>}
            {showActions && whatsappUrl && <Button asChild size="sm"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /><span>WhatsApp</span></a></Button>}
            {showActions && phone && <Button asChild size="sm" variant="outline"><a href={`tel:${phone.replace(/\s/g, "")}`}><Phone size={16} /><span>Call</span></a></Button>}
          </div>
          <button type="button" className={styles.menuToggle} aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls={navId} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
        <nav id={navId} className={`${styles.nav} ${styles[`menu_${menuStyle}`]} ${styles[`menuPos_${menuPosition}`]} ${menuVisibility === "auto" && !navVisible && !menuOpen ? styles.navHidden : ""} ${menuOpen ? styles.navOpen : ""}`} aria-label="Business website navigation">
          {navItems.map(item => item.href.startsWith("#") ? <a key={item.href + item.label} className={`${styles.navLink} ${item.active ? styles.active : ""}`} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a> : <Link key={item.href + item.label} className={`${styles.navLink} ${item.active ? styles.active : ""}`} to={navHref(item.href)} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
        </nav>
      </div>
    </header>
  );
};