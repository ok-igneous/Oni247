import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { StorefrontHeader } from "./StorefrontHeader";
import { storeThemeEngine } from "../helpers/storeThemeEngine";
import type { OutputType } from "../endpoints/storefront_GET.schema";
import styles from "./StoreServiceShell.module.css";

/** The shop's own header, theme and footer around a service booking page. */
export function StoreServiceShell({ data, title, children }: { data: OutputType; title: string; children: ReactNode }) {
  const business = data.business;
  const theme = storeThemeEngine(business.themeId, business.appearanceSettings ?? {});
  const appearance = business.appearanceSettings ?? {};
  const homePage = typeof appearance.homePage === "string" ? appearance.homePage : "home";
  const footerMode = appearance.footerMode === "none" || appearance.footerMode === "selected" ? appearance.footerMode : "all";
  const home = homePage === "home" ? `/${business.slug}` : `/${business.slug}/${homePage}`;
  return (
    <div className={styles.site} style={theme.style as CSSProperties}>
      <Helmet>
        <title>{`${title} — ${business.name}`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <StorefrontHeader
        businessName={business.name}
        logoUrl={business.logoUrl}
        tagline={typeof appearance.headerTagline === "string" ? appearance.headerTagline : ""}
        headerBrand={typeof appearance.headerBrand === "string" ? appearance.headerBrand : "logo_name"}
        headerAlignment={theme.headerAlignment}
        menuStyle={theme.menuStyle as "bar" | "minimal" | "pills"}
        menuPosition={theme.menuPosition as "left" | "center" | "right"}
        menuVisibility={theme.menuVisibility as "always" | "auto"}
        navItems={[
          { label: "Home", href: home },
          ...(data.products.length ? [{ label: "Products", href: `/${business.slug}/products` }] : []),
          { label: "Services", href: `/${business.slug}/services`, active: true },
          { label: "About", href: `/${business.slug}/about` },
          { label: "Contact", href: `/${business.slug}/contact` },
        ]}
      />
      <main className={styles.content}>{children}</main>
      {footerMode !== "none" && (
        <footer className={styles.footer}>
          <Link to={home}>{business.name}</Link> · <Link to={`/${business.slug}/contact`}>Contact</Link>
        </footer>
      )}
    </div>
  );
}
