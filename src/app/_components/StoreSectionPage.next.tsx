"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/Input";
import { Textarea } from "../../../components/Textarea";
import { StoreOptionsDialog } from "../../../components/StoreOptionsDialog";
import { StoreProductCardNext } from "./StoreProductCard.next";
import { StoreServiceCardNext } from "./StoreServiceCard.next";
import { StoreCartDockNext } from "./StoreCartDock.next";
import { StorefrontHeaderNext } from "./StorefrontHeader.next";
import { useStoreCart } from "../../../helpers/useStoreCart";
import { useStorefront } from "../../../helpers/useStorefront";
import { storeThemeEngine } from "../../../helpers/storeThemeEngine";
import { getPublicGalleries } from "../../../endpoints/galleries/publicList_GET.schema";
import { postStorefrontEnquiry } from "../../../endpoints/storefront/enquiry_POST.schema";
import type { OutputType as StorefrontOutput, StorefrontProduct } from "../../../endpoints/storefront_GET.schema";
import styles from "../../../pages/store.$slug.$page.module.css";

const pages = ["products", "services", "about", "gallery", "blog", "events", "contact"] as const;

export default function StoreSectionPageNext({ slug, page, initialData, customDomain = false }: { slug: string; page: string; initialData: StorefrontOutput; customDomain?: boolean }) {
  const { data } = useStorefront(slug, initialData);
  const [galleries, setGalleries] = useState<Array<{ id: string; slug: string; name: string; description: string | null; coverImageUrl: string | null; imageCount: number }>>([]);
  const [galleryError, setGalleryError] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryRetry, setGalleryRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [visible, setVisible] = useState(12);
  const [optionsProduct, setOptionsProduct] = useState<StorefrontProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [enquiry, setEnquiry] = useState({ name: "", phone: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const cart = useStoreCart(slug);

  useEffect(() => {
    if (page !== "gallery") return;
    let active = true;
    setGalleryLoading(true);
    setGalleryError(false);
    void getPublicGalleries(slug).then(result => {
      if (active) setGalleries(result.galleries);
    }).catch(() => {
      if (active) { setGalleries([]); setGalleryError(true); }
    }).finally(() => { if (active) setGalleryLoading(false); });
    return () => { active = false; };
  }, [slug, page, galleryRetry]);

  const business = data?.business ?? initialData.business;
  const storefrontPath = (suffix = "") => customDomain ? (suffix ? `/${suffix.replace(/^\\/+/, "")}` : "/") : `/${encodeURIComponent(slug)}${suffix ? `/${suffix.replace(/^\\/+/, "")}` : ""}`;
  const isValidPage = (pages as readonly string[]).includes(page);
  const appearance = business.appearanceSettings ?? {};
  const theme = storeThemeEngine(business.themeId, appearance);
  const title = page === "about" ? "About us" : page.charAt(0).toUpperCase() + page.slice(1);
  const homePage = typeof appearance.homePage === "string" ? appearance.homePage : "home";
  const navItems = [
    { label: "Home", href: homePage === "home" ? storefrontPath() : storefrontPath(homePage) },
    ...pages.filter(item => item !== homePage &&
      (item !== "products" || initialData.products.length > 0) &&
      (item !== "services" || initialData.services.length > 0) &&
      (item !== "blog" || initialData.blogPosts.length > 0) &&
      (item !== "events" || initialData.events.length > 0)
    ).map(item => ({ label: item[0].toUpperCase() + item.slice(1), href: storefrontPath(item), active: item === page })),
    { label: "Track order", href: storefrontPath("track") },
  ];

  const products = data?.products ?? initialData.products;
  const categories = data?.categories ?? initialData.categories;
  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter(item =>
      (category === "all" || item.categoryId === category) &&
      (!term || item.name.toLowerCase().includes(term) || (item.description ?? "").toLowerCase().includes(term))
    ).slice(0, visible);
  }, [products, search, category, visible]);

  const handleAdd = (product: StorefrontProduct) => {
    if (product.variants?.length) { setOptionsProduct(product); return; }
    cart.add({ productId: product.id, name: product.name, price: product.price, currency: product.currency, imageUrl: product.imageUrl });
    setCartOpen(true);
  };

  const sendEnquiry = async () => {
    if (!enquiry.name.trim() || !enquiry.message.trim()) {
      toast.error("Enter your name and message first.");
      return;
    }
    setSending(true);
    try {
      await postStorefrontEnquiry({ slug, customerName: enquiry.name, customerPhone: enquiry.phone, customerEmail: enquiry.email, message: enquiry.message });
      setSent(true);
      setEnquiry({ name: "", phone: "", email: "", message: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your enquiry.");
    } finally { setSending(false); }
  };

  if (!isValidPage) return <main className={styles.page}><h1>Page not found</h1><Link href={storefrontPath()}>Back to website</Link></main>;
  if (business.appearanceSettings?.siteMode !== "multi_page" || !business.canUseMultiPage) {
    return <main className={styles.page}><div className={styles.main}><h1>Premium Plus page</h1><p>This business is currently using its one-page website.</p><Link href={`/${slug}`}>Back to website</Link></div></main>;
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : `/${slug}/${page}`;
  const shareText = encodeURIComponent(`${title} — ${business.name} ${shareUrl}`);
  const footerMode = appearance.footerMode === "none" || appearance.footerMode === "selected" ? appearance.footerMode : "all";
  const footerPages = Array.isArray(appearance.footerPages) ? appearance.footerPages : [];
  const showFooter = footerMode === "all" || (footerMode === "selected" && footerPages.includes(page));

  return (
    <div className={styles.page} style={theme.style as React.CSSProperties}>
      <StorefrontHeaderNext businessName={business.name} logoUrl={business.logoUrl} tagline={typeof appearance.headerTagline === "string" ? appearance.headerTagline : ""} headerBrand={typeof appearance.headerBrand === "string" ? appearance.headerBrand : "logo_name"} headerAlignment={theme.headerAlignment} menuStyle={theme.menuStyle as "bar" | "minimal" | "pills"} menuPosition={theme.menuPosition as "left" | "center" | "right"} menuVisibility={theme.menuVisibility as "always" | "auto"} navItems={navItems} phone={business.phone} />
      <main className={styles.main}>
        <div className={styles.titleRow}><h1>{title}</h1></div>

        {page === "about" && <section><p>{business.description || "Learn more about this business."}</p>{business.address && <p>{business.address}</p>}{business.openingHours && <p>{business.openingHours}</p>}</section>}

        {page === "products" && <>
          <div className={styles.enquiryForm}>
            <label>Search products<Input value={search} onChange={event => { setSearch(event.target.value); setVisible(12); }} placeholder="Search products" /></label>
            {categories.length > 0 && <label>Category<select value={category} onChange={event => { setCategory(event.target.value); setVisible(12); }}><option value="all">All categories</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          </div>
          <div className={styles.grid}>{visibleProducts.map(product => <StoreProductCardNext key={product.id} product={product} to={business.canUseProductLinks ? storefrontPath(`p/${product.slug}`) : undefined} onAdd={() => handleAdd(product)} />)}</div>
          {products.length === 0 && <p>No products have been published yet.</p>}
          {products.length > visibleProducts.length && <div className={styles.shareBar}><Button variant="outline" onClick={() => setVisible(count => count + 12)}>Show more products</Button></div>}
        </>}

        {page === "services" && <div className={styles.grid}>{initialData.services.map(service => <StoreServiceCardNext key={service.id} service={service} businessSlug={slug} customDomain={customDomain} />)}</div>}

        {page === "gallery" && (galleryLoading ? <p>Loading galleries…</p> : galleryError ? <section><p>We could not load the galleries right now.</p><Button onClick={() => setGalleryRetry(value => value + 1)}>Try again</Button></section> : galleries.length === 0 ? <p>No public galleries have been added yet.</p> : <div className={styles.grid}>{galleries.map(gallery => <article key={gallery.id}>{gallery.coverImageUrl && <Link href={storefrontPath(`g/${gallery.slug}`)}><img src={gallery.coverImageUrl} alt={gallery.name} loading="lazy" /></Link>}<h2><Link href={`/${slug}/g/${gallery.slug}`}>{gallery.name}</Link></h2>{gallery.description && <p>{gallery.description}</p>}<p>{gallery.imageCount} {gallery.imageCount === 1 ? "photo" : "photos"}</p><Link href={`/${slug}/g/${gallery.slug}`}>Open gallery →</Link></article>)}</div>)}

        {page === "blog" && <div className={styles.list}>{initialData.blogPosts.map(post => <article key={post.id}>{post.coverImageUrl && <Link href={storefrontPath(`b/${post.slug}`)}><img className={styles.articleCover} src={post.coverImageUrl} alt="" loading="lazy" /></Link>}<h2><Link href={`/${slug}/b/${post.slug}`}>{post.title}</Link></h2>{post.excerpt && <p>{post.excerpt}</p>}<Link href={`/${slug}/b/${post.slug}`}>Read article →</Link></article>)}{initialData.blogPosts.length === 0 && <p>No articles have been published yet.</p>}</div>}

        {page === "events" && <div className={styles.grid}>{initialData.events.map(event => <article key={event.id}>{event.coverImageUrl && <Link href={storefrontPath(`e/${event.slug}`)}><img src={event.coverImageUrl} alt="" loading="lazy" /></Link>}<h2><Link href={`/${slug}/e/${event.slug}`}>{event.title}</Link></h2><p>{new Date(event.startsAt).toLocaleString()}</p>{event.venue && <p>{event.venue}</p>}<Link href={`/${slug}/e/${event.slug}`}>{event.registrationEnabled ? "Details & register →" : "View event →"}</Link></article>)}{initialData.events.length === 0 && <p>There are no events right now. Check back soon.</p>}</div>}

        {page === "contact" && <section className={styles.contactSection}>
          {business.phone && <p>Phone: <a href={`tel:${business.phone}`}>{business.phone}</a></p>}
          {business.email && <p>Email: <a href={`mailto:${business.email}`}>{business.email}</a></p>}
          {business.whatsappNumber && <p><a href={`https://wa.me/${business.whatsappNumber.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Contact on WhatsApp</a></p>}
          {business.address && <p>{business.address}</p>}
          <div className={styles.enquiryForm}><h2>Send an enquiry</h2>{sent ? <p role="status">Thank you. Your enquiry has been sent to {business.name}.</p> : <>
            <label>Your name<Input value={enquiry.name} onChange={event => setEnquiry(value => ({ ...value, name: event.target.value }))} /></label>
            <label>Phone or WhatsApp<Input value={enquiry.phone} onChange={event => setEnquiry(value => ({ ...value, phone: event.target.value }))} /></label>
            <label>Email (optional)<Input type="email" value={enquiry.email} onChange={event => setEnquiry(value => ({ ...value, email: event.target.value }))} /></label>
            <label>How can we help?<Textarea value={enquiry.message} onChange={event => setEnquiry(value => ({ ...value, message: event.target.value }))} rows={5} /></label>
            <Button onClick={() => void sendEnquiry()} disabled={sending}>{sending ? "Sending…" : "Send enquiry"}</Button>
          </>}</div>
        </section>}

        <div className={styles.shareBottom}><span>Share this page</span><div className={styles.shareWrap}><button type="button" className={styles.shareButton} onClick={() => setShareOpen(value => !value)} aria-expanded={shareOpen}>Share</button>{shareOpen && <div className={styles.shareMenu}><a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer">WhatsApp</a><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer">Facebook</a><button type="button" onClick={() => { void navigator.clipboard.writeText(shareUrl).then(() => { toast.success("Page link copied."); setShareOpen(false); }, () => toast.error("Could not copy the link.")); }}>Copy link</button></div>}</div></div>
      </main>
      {showFooter && <footer className={styles.footer}><Link href={`/${slug}`}>← Back to home</Link><span>© {new Date().getFullYear()} {business.name}</span></footer>}
      <StoreCartDockNext slug={slug} currency={business.currency} cart={cart} open={cartOpen} onOpenChange={setCartOpen} customDomain={customDomain} />
      {optionsProduct && <StoreOptionsDialog product={optionsProduct} onClose={() => setOptionsProduct(null)} onConfirm={item => { cart.add(item); setCartOpen(true); }} />}
    </div>
  );
}
