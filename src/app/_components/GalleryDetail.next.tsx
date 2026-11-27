"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { storeThemeEngine } from "../../../helpers/storeThemeEngine";
import type { OutputType } from "../../../endpoints/galleries/public_GET.schema";
import { StorefrontHeaderNext } from "./StorefrontHeader.next";
import styles from "../../../pages/store.$slug.g.$gallerySlug.module.css";

type Props = { data: OutputType; gallerySlug: string; customDomain: boolean; origin: string };

export default function GalleryDetailNext({ data, gallerySlug, customDomain, origin }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const { business, gallery } = data;
  const appearance = business.appearanceSettings ?? {};
  const theme = storeThemeEngine(business.themeId as import("../../../helpers/schema").StoreTheme, appearance);
  const path = (suffix: string) => customDomain ? (suffix || "/") : `/${encodeURIComponent(business.slug)}${suffix}`;
  const homePage = typeof appearance.homePage === "string" ? appearance.homePage : "home";
  const home = homePage === "home" ? path("") : path(`/${homePage}`);
  const current = active === null ? null : gallery.images[active];
  const canonical = new URL(path(`/g/${encodeURIComponent(gallerySlug)}`), origin).toString();
  const shareUrl = new URL(`/_api/share/page?slug=${encodeURIComponent(business.slug)}&kind=gallery&id=${encodeURIComponent(gallerySlug)}`, origin).toString();
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: gallery.name,
    description: gallery.description ?? `Photos from ${gallery.name} at ${business.name}.`,
    url: canonical,
    image: gallery.coverImageUrl ? [gallery.coverImageUrl] : gallery.images.slice(0, 10).map((image) => image.imageUrl),
    isPartOf: { "@type": "WebSite", name: business.name },
  }).replace(/</g, "\\u003c");

  return (
    <div className={styles.page} style={theme.style as React.CSSProperties}>
      <StorefrontHeaderNext
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
          { label: "Products", href: path("/products") },
          ...(data.business.name ? [{ label: "Services", href: path("/services") }] : []),
          { label: "Gallery", href: path("/gallery"), active: true },
          ...(appearance.eventsPageInMenu === true ? [{ label: "Events", href: path("/events") }] : []),
          { label: "Contact", href: path("/contact") },
        ]}
      />
      <main>
        <h1>{gallery.name}</h1>
        {gallery.description && <p>{gallery.description}</p>}
        <div className={styles.grid}>
          {gallery.images.map((item, index) => (
            <button key={item.id} type="button" onClick={() => setActive(index)} aria-label={`View image ${index + 1}: ${item.altText ?? item.caption ?? gallery.name}`}>
              <img src={item.imageUrl} alt={item.altText ?? item.caption ?? gallery.name} loading="lazy" />
              {item.caption && <span>{item.caption}</span>}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 28, padding: "12px 14px", border: "1px solid var(--border)", borderRadius: "var(--store-card-radius, 10px)", background: "var(--card)" }}>
          <span style={{ fontWeight: 650 }}>Share this gallery</span>
          <button type="button" style={{ minHeight: 42, padding: "8px 14px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", color: "var(--foreground)", font: "inherit", cursor: "pointer" }} onClick={() => {
            if (navigator.share) void navigator.share({ title: gallery.name + " — " + business.name, url: shareUrl }).catch(() => {});
            else if (navigator.clipboard) void navigator.clipboard.writeText(shareUrl);
          }}>Share</button>
        </div>
      </main>
      <footer className={styles.footer}>
        <Link href={home}>{business.name}</Link>
        <span>© {new Date().getFullYear()} {business.name}</span>
      </footer>
      {current && (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={gallery.name} onClick={() => setActive(null)}>
          <button className={styles.close} type="button" aria-label="Close image" onClick={() => setActive(null)}><X /></button>
          <button className={styles.prev} type="button" aria-label="Previous image" onClick={(event) => { event.stopPropagation(); setActive(Math.max(0, (active ?? 0) - 1)); }}><ChevronLeft /></button>
          <figure onClick={(event) => event.stopPropagation()}>
            <img src={current.imageUrl} alt={current.altText ?? gallery.name} />
            <figcaption>{current.caption}</figcaption>
          </figure>
          <button className={styles.next} type="button" aria-label="Next image" onClick={(event) => { event.stopPropagation(); setActive(Math.min(gallery.images.length - 1, (active ?? 0) + 1)); }}><ChevronRight /></button>
        </div>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </div>
  );
}
