import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { TestimonialsSection } from "../components/TestimonialsSection";
import { readTestimonialConfig } from "../helpers/testimonialConfig";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Star,
  X,
  Menu,
  Home,
  LayoutGrid,
  ClipboardList,
} from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Textarea } from "../components/Textarea";
import { StoreProductCard } from "../components/StoreProductCard";
import { StoreCartDock } from "../components/StoreCartDock";
import { StoreOptionsDialog } from "../components/StoreOptionsDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/Select";
import { formatMoney } from "../helpers/formatMoney";
import { buildWhatsAppOrderUrl } from "../helpers/buildWhatsAppOrderUrl";
import { useStoreCart } from "../helpers/useStoreCart";
import { useMyOrders } from "../helpers/useMyOrders";
import { useStorefront } from "../helpers/useStorefront";
import { getPublicGalleries } from "../endpoints/galleries/publicList_GET.schema";
import { postStorefrontEnquiry } from "../endpoints/storefront/enquiry_POST.schema";
import { trackStoreEvent } from "../helpers/trackStoreEvent";
import { storeThemeEngine } from "../helpers/storeThemeEngine";
import { normalizeVideoEmbedUrl } from "../helpers/normalizeVideoEmbedUrl";
import { StorefrontHeader } from "../components/StorefrontHeader";
import { StorefrontHero } from "../components/StorefrontHero";
import { StoreServiceCard } from "../components/StoreServiceCard";
import type { StorefrontProduct } from "../endpoints/storefront_GET.schema";
import styles from "./store.$slug.module.css";
import { shareLink } from "../endpoints/share/page_GET.schema";

const safeContentLink = (value: string): string | null => {
  const trimmed = value.trim();
  if ((trimmed.startsWith("/") && !trimmed.startsWith("//")) || trimmed.startsWith("#") || trimmed.startsWith("tel:") || trimmed.startsWith("mailto:")) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
};

const StorePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data, isFetching, error } = useStorefront(slug);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [optionsProduct, setOptionsProduct] = useState<StorefrontProduct | null>(null);
  const [sort, setSort] = useState<"featured" | "price_asc" | "price_desc" | "name">("featured");
  const [visibleCount, setVisibleCount] = useState(12);

  const [enquiry, setEnquiry] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [enquirySending, setEnquirySending] = useState(false);
  const [enquirySent, setEnquirySent] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [galleries, setGalleries] = useState<Awaited<ReturnType<typeof getPublicGalleries>>["galleries"]>([]);

  useEffect(() => {
    if (!slug) { setGalleries([]); return; }
    void getPublicGalleries(slug).then(r => setGalleries(r.galleries)).catch(() => setGalleries([]));
  }, [slug, data?.business.canUseMultiPage]);
  useEffect(() => {
    if (data?.business) trackStoreEvent("store_view", { businessSlug: data.business.slug });
  }, [data?.business]);
  useEffect(() => {
    const slides = Array.isArray(data?.business.contentSettings?.homepageSlides) ? data.business.contentSettings.homepageSlides : [];
    if (slides.length < 2 || data?.business.appearanceSettings?.siteType === "online_store") return;
    const interval = typeof data?.business.contentSettings?.homepageSliderInterval === "number" ? Math.min(10,Math.max(3,data.business.contentSettings.homepageSliderInterval)) : 5;
    const timer = window.setInterval(() => setActiveSlideIndex(current => (current + 1) % slides.length), interval * 1000);
    return () => window.clearInterval(timer);
  }, [data?.business.contentSettings?.homepageSlides]);

  const cart = useStoreCart(slug ?? "unknown");
  const myOrders = useMyOrders(slug);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 40 || y < lastY - 4) setNavVisible(true);
      else if (y > lastY + 4) setNavVisible(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const products = data?.products ?? [];
  const services = data?.services ?? [];
  const categories = data?.categories ?? [];
  const testimonials = data?.testimonials ?? [];
  const portfolio = data?.portfolio ?? [];
  const blogPosts = data?.blogPosts ?? [];
  const events = data?.events ?? [];

  const featured = useMemo(
    () => products.filter((product) => product.featured),
    [products],
  );
  const onSaleProducts = useMemo(() => products.filter(product => product.available && typeof product.compareAtPrice === "number" && product.compareAtPrice > product.price), [products]);
  const newArrivals = useMemo(() => [...products].filter(product => product.createdAt).sort((a,b)=>new Date(b.createdAt as Date).getTime()-new Date(a.createdAt as Date).getTime()).slice(0,8), [products]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory =
        !activeCategory || product.categoryId === activeCategory;
      const matchesTerm =
        term.length === 0 ||
        product.name.toLowerCase().includes(term) ||
        (product.description ?? "").toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
    if (sort === "price_asc") return [...filtered].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") return [...filtered].sort((a, b) => b.price - a.price);
    if (sort === "name") return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [products, search, activeCategory, sort]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      if (product.categoryId) {
        counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
      }
    }
    return counts;
  }, [products]);

  if (isFetching && !data) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <div className={styles.identity}>
              <Skeleton className={styles.skeletonLogo} />
              <div className={styles.identityText}>
                <Skeleton className={styles.skeletonTitle} />
                <Skeleton className={styles.skeletonLine} />
              </div>
            </div>
          </div>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <div className={styles.grid}>
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className={styles.skeletonCard} />
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.notFound}>
            <h1 className={styles.notFoundTitle}>Page not found</h1>
            <p className={styles.emptyBody}>
              No published business page exists at this address. Check the link,
              or ask the business to share it again.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const business = data.business;
  const theme = business.themeId;
  const appearance = business.appearanceSettings ?? {};
  const isOnlineStore = appearance.siteType === "online_store";
  const isService = theme === "service" || appearance.siteType === "service_business";
  const content = business.contentSettings ?? {};
  const rawHomeSlides = Array.isArray(content.homepageSlides) ? content.homepageSlides : [];
  const homepageSlides = business.canUseMultiPage ? rawHomeSlides.slice(0, 5).flatMap((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const slide = raw as Record<string, unknown>;
    const imageUrl = typeof slide.imageUrl === "string" ? safeContentLink(slide.imageUrl) : null;
    const ctaUrl = typeof slide.ctaUrl === "string" ? safeContentLink(slide.ctaUrl) : null;
    const headline = typeof slide.headline === "string" ? slide.headline.trim() : "";
    const text = typeof slide.text === "string" ? slide.text.trim() : "";
    const ctaLabel = typeof slide.ctaLabel === "string" ? slide.ctaLabel.trim() : "";
    if (!imageUrl && !headline && !text) return [];
    return [{ id: typeof slide.id === "string" ? slide.id : `slide-${index + 1}`, imageUrl, headline, text, ctaLabel, ctaUrl }];
  }) : [];
  const homepageVideoUrl = business.canUseMultiPage && typeof content.homepageVideoUrl === "string"
    ? normalizeVideoEmbedUrl(content.homepageVideoUrl)
    : null;
  const homepageVideoFileUrl = business.canUseMultiPage && typeof content.homepageVideoFileUrl === "string" ? safeContentLink(content.homepageVideoFileUrl) : null;
  const sliderInHero = content.homepageSliderPlacement !== "section";
  const videoInHero = content.homepageVideoPlacement === "hero";
  const menuVisibility = appearance.menuVisibility === "always" ? "always" : "auto";
  const menuStyle = appearance.menuStyle === "pills" || appearance.menuStyle === "minimal" ? appearance.menuStyle : "bar";
  const layout = appearance.layout === "wide" || appearance.layout === "compact" ? appearance.layout : "standard";
  const themeEngine = storeThemeEngine(theme, appearance);
  const showHeaderActions = themeEngine.headerActions;
  const headerBrand = themeEngine.headerBrand;
  const headerTagline = themeEngine.headerTagline;
  const menuPosition = themeEngine.menuPosition;
  const heroLayout = themeEngine.heroLayout;
  const whatsappNumber = business.whatsappNumber ?? business.phone ?? "";

  const enquiryUrl = buildWhatsAppOrderUrl({
    businessName: business.name,
    whatsappNumber,
    currency: business.currency,
    items: [],
  });

  const defaultHeroAction = isOnlineStore ? "Shop now" : appearance.siteType === "service_business" ? "Book a service" : appearance.siteType === "portfolio" ? "View our work" : appearance.siteType === "events_community" ? "Explore events" : "Message us on WhatsApp";
  const heroActionUrl = isOnlineStore ? "#catalogue" : appearance.siteType === "portfolio" ? "#work" : appearance.siteType === "events_community" ? "#events" : whatsappNumber ? enquiryUrl : "#contact";
  const siteMode = themeEngine.siteMode === "multi_page" && business.canUseMultiPage ? "multi_page" : "one_page";
  const sections = {
    hero: true, slider: true, video: true, gallery: true, services: true, featured: true, catalogue: true, about: true,
    work: true, testimonials: true, blog: true, events: true, contact: true,
    ...(typeof appearance.sections === "object" && appearance.sections !== null ? appearance.sections : {}),
  };
  const sectionOrder = Array.isArray(appearance.sectionOrder) ? appearance.sectionOrder.filter((key): key is string => typeof key === "string") : [];
  const onlineStoreOrder: Record<string, number> = { hero: 10, slider: 10, categories: 11, trust: 12, onsale: 13, new: 14, featured: 15, catalogue: 16, video: 30, gallery: 31, events: 32, services: 33, about: 34, work: 35, testimonials: 36, blog: 37, contact: 38 };
  const orderOf = (key: string) => { if (isOnlineStore && sectionOrder.length === 0 && key in onlineStoreOrder) return onlineStoreOrder[key]; const index = sectionOrder.indexOf(key); return 10 + (index < 0 ? ["hero","slider","video","gallery","services","featured","catalogue","about","work","testimonials","blog","events","contact"].indexOf(key) : index); };
  const selectedHomePage = typeof appearance.homePage === "string" ? appearance.homePage : "home";
  const footerMode = appearance.footerMode === "none" || appearance.footerMode === "selected" ? appearance.footerMode : "all";
  const footerPages = Array.isArray(appearance.footerPages) ? appearance.footerPages.filter((key): key is string => typeof key === "string") : [];
  const showFooter = footerMode === "all" || (footerMode === "selected" && footerPages.includes(selectedHomePage === "home" ? "home" : selectedHomePage));
  if (siteMode === "multi_page" && selectedHomePage !== "home" && ["products","services","about","gallery","blog","events","contact"].includes(selectedHomePage)) return <Navigate to={`/${business.slug}/${selectedHomePage}`} replace />;
  const pageStyle = themeEngine.style as React.CSSProperties;
  const shareDescription =
    business.description ?? `Browse products and services from ${business.name}.`;
  const shareUrl = typeof window !== "undefined" ? window.location.href : `/${business.slug}`;

  const handleAdd = (product: StorefrontProduct) => {
    // Products with Size/Colour etc. need a choice before they can go in the cart.
    if ((product.variants?.length ?? 0) > 0) {
      setOptionsProduct(product);
      return;
    }
    cart.add({
      productId: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency,
      imageUrl: product.imageUrl,
      maxQuantity: product.stockQuantity ?? null,
    });
    setCartOpen(true);
  };

  const handleSendEnquiry = async () => {
    if (!slug) return;
    setEnquirySending(true);
    trackStoreEvent("enquiry_submit", { businessSlug: slug });
    try {
      await postStorefrontEnquiry({
        slug,
        customerName: enquiry.name,
        customerPhone: enquiry.phone,
        customerEmail: enquiry.email,
        message: enquiry.message,
      });
      setEnquirySent(true);
      setEnquiry({ name: "", phone: "", email: "", message: "" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not send your message.",
      );
    } finally {
      setEnquirySending(false);
    }
  };

  return (
    <div className={`${styles.page} ${styles[`theme_${theme}`]} ${styles[`layout_${layout}`]} ${isOnlineStore ? styles.onlineStore : ""}`} style={pageStyle}>
      <Helmet>
        <title>{(typeof appearance.seoTitle === "string" && appearance.seoTitle) || `${business.name} — Products & Services`}</title>
        <meta name="description" content={(typeof appearance.seoDescription === "string" && appearance.seoDescription) || shareDescription} />
        <meta property="og:title" content={(typeof appearance.seoTitle === "string" && appearance.seoTitle) || business.name} />
        <meta property="og:site_name" content={business.name} />
        <meta property="og:description" content={(typeof appearance.seoDescription === "string" && appearance.seoDescription) || shareDescription} />
        <meta property="og:type" content="website" />
        {(typeof appearance.shareImageUrl === "string" && appearance.shareImageUrl) || business.heroImageUrl || business.logoUrl ? (
          <meta property="og:image" content={(typeof appearance.shareImageUrl === "string" && appearance.shareImageUrl) || business.heroImageUrl || business.logoUrl || ""} />
        ) : null}
      </Helmet>

      <StorefrontHeader businessName={business.name} logoUrl={business.logoUrl} tagline={headerTagline} headerBrand={headerBrand} headerAlignment={themeEngine.headerAlignment} showActions={showHeaderActions} whatsappUrl={whatsappNumber ? enquiryUrl : undefined} phone={business.phone} navItems={siteMode === "multi_page" ? [
        { label: "Home", href: selectedHomePage === "home" ? `/${business.slug}` : `/${business.slug}/${selectedHomePage}` },
        { label: "Products", href: `/${business.slug}/products` }, { label: "Services", href: `/${business.slug}/services` },
        { label: "About", href: `/${business.slug}/about` }, ...(blogPosts.length ? [{ label: "Blog", href: `/${business.slug}/blog` }] : []),
        { label: "Gallery", href: `/${business.slug}/gallery` }, ...(events.length && appearance.eventsPageInMenu === true ? [{ label: "Events", href: `/${business.slug}/events` }] : []),
        { label: "Contact", href: `/${business.slug}/contact` }, { label: "Track order", href: `/${business.slug}/track` },
      ] : isOnlineStore ? [
        { label: "Home", href: "#home" }, { label: "Categories", href: categories.length > 0 ? "#categories" : "#catalogue" }, { label: "Shop", href: "#catalogue" },
        { label: "About", href: "#about" }, { label: "Contact", href: "#contact" }, { label: "Track order", href: `/${business.slug}/track` },
      ] : appearance.siteType === "service_business" ? [
        { label: "Home", href: "#home" }, { label: "Services", href: "#services" }, { label: "How it works", href: "#about" }, { label: "Contact", href: "#contact" },
      ] : appearance.siteType === "portfolio" ? [
        { label: "Home", href: "#home" }, { label: "Our work", href: "#work" }, { label: "Gallery", href: "#gallery" }, { label: "About", href: "#about" }, { label: "Contact", href: "#contact" },
      ] : appearance.siteType === "events_community" ? [
        { label: "Home", href: "#home" }, { label: "Events", href: "#events" }, { label: "Community", href: "#blog" }, { label: "About", href: "#about" }, { label: "Contact", href: "#contact" },
      ] : [
        { label: "Home", href: "#home" }, { label: isService ? "Services" : "Products", href: isService && services.length ? "#services" : "#catalogue" },
        { label: "About", href: "#about" }, ...(sections.blog && blogPosts.length ? [{ label: "Blog", href: "#blog" }] : []),
        ...(events.length && sections.events !== false ? [{ label: "Events", href: "#events" }] : []), { label: "Contact", href: "#contact" },
        { label: "Track order", href: `/${business.slug}/track` },
      ]} menuStyle={menuStyle} menuPosition={menuPosition as "left"|"center"|"right"} menuVisibility={menuVisibility} navVisible={navVisible} cartCount={isOnlineStore ? cart.count : undefined} onCartClick={isOnlineStore ? () => { if (cart.count > 0) setCartOpen(true); else toast("Your cart is empty."); } : undefined} />

      {isOnlineStore && <div className={styles.storeCallStrip}>{(business.phone || whatsappNumber) ? <><span>Call to order</span>{business.phone && <a href={`tel:${business.phone.replace(/\s/g, "")}`}>{business.phone}</a>}{whatsappNumber && <a href={enquiryUrl} target="_blank" rel="noopener noreferrer">WhatsApp order</a>}</> : <span>Welcome to {business.name}</span>}</div>}
      {isOnlineStore && <div className={styles.storeSearchRow}><Search size={18} aria-hidden="true"/><Input value={search} onChange={event=>{setSearch(event.target.value);setVisibleCount(12);}} onKeyDown={event=>{if(event.key==="Enter")document.getElementById("catalogue")?.scrollIntoView({behavior:"smooth"});}} enterKeyHint="search" type="search" placeholder="Search products" aria-label="Search products"/></div>}

      <main className={styles.main} style={{ display: "flex", flexDirection: "column" }}>
        {sections.hero && !((sections.slider !== false && homepageSlides.length > 0 && sliderInHero) || (sections.video !== false && (homepageVideoUrl || homepageVideoFileUrl) && videoInHero)) && <StorefrontHero headline={business.heroHeadline} description={business.heroSubtext} imageUrl={business.heroImageUrl} layout={heroLayout as "full"|"left"|"right"|"text"} actionUrl={heroActionUrl} actionLabel={business.heroCtaLabel || defaultHeroAction} style={{order:orderOf("hero")}} />}

        {sections.slider !== false && homepageSlides.length > 0 && (
          <section className={styles.homepageSlider} style={{ order: orderOf(sliderInHero ? "hero" : "slider") }} aria-label="Featured slides">
            <div className={styles.sliderViewport}>
              <div className={styles.sliderTrack} style={{ transform: `translateX(-${Math.min(activeSlideIndex, homepageSlides.length - 1) * 100}%)` }}>
                {homepageSlides.map((slide) => (
                  <article className={`${styles.homeSlide} ${slide.imageUrl ? "" : styles.homeSlideNoImage}`} key={slide.id}>
                    {slide.imageUrl && <img className={styles.homeSlideImage} src={slide.imageUrl} alt={slide.headline} loading="lazy" decoding="async" />}
                    <div className={styles.homeSlideText}>
                      {slide.headline && <h2>{slide.headline}</h2>}
                      {slide.text && <p>{slide.text}</p>}
                      {slide.ctaLabel && slide.ctaUrl && <Button asChild size="sm"><a href={slide.ctaUrl} target={slide.ctaUrl.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{slide.ctaLabel}</a></Button>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
            {homepageSlides.length > 1 && <div className={styles.sliderControls}>
              <Button variant="outline" size="sm" aria-label="Previous slide" onClick={() => setActiveSlideIndex((current) => (current - 1 + homepageSlides.length) % homepageSlides.length)}><ChevronLeft size={16} /> Previous</Button>
              <span>Slide {Math.min(activeSlideIndex, homepageSlides.length - 1) + 1} of {homepageSlides.length}</span>
              <Button variant="outline" size="sm" aria-label="Next slide" onClick={() => setActiveSlideIndex((current) => (current + 1) % homepageSlides.length)}>Next <ChevronRight size={16} /></Button>
            </div>}
          </section>
        )}

        {isOnlineStore && categories.length > 0 && <section className={styles.storeCategorySection} id="categories" style={{order:orderOf("categories")}}><div className={styles.catalogueHead}><h2 className={styles.sectionHeading}>Shop by category</h2><button type="button" className={styles.storeCategoryAll} onClick={()=>{setActiveCategory(null);setSearch("");}}>View all</button></div><div className={styles.storeCategoryGrid}><button type="button" className={`${styles.storeCategoryTile} ${activeCategory===null?styles.storeCategoryActive:""}`} onClick={()=>{setActiveCategory(null);setVisibleCount(12);document.getElementById("catalogue")?.scrollIntoView({behavior:"smooth"});}}>All products<span>{products.length} items</span></button>{categories.map(category=><button type="button" key={category.id} className={`${styles.storeCategoryTile} ${activeCategory===category.id?styles.storeCategoryActive:""}`} onClick={()=>{setActiveCategory(category.id);setVisibleCount(12);document.getElementById("catalogue")?.scrollIntoView({behavior:"smooth"});}}>{category.name}<span>{categoryCounts.get(category.id)??0} items</span></button>)}</div></section>}

        {isOnlineStore && (()=>{const c=business.checkout;const trust=[...(c?.deliveryEnabled?[{title:"Delivery available",detail:c.deliveryNote||"Delivery options at checkout"}]:[]),...(c?.freeDeliveryOver!==null&&c?.freeDeliveryOver!==undefined?[{title:"Free delivery offer",detail:`Free delivery on orders above ${formatMoney(c.freeDeliveryOver,business.currency)}`}]:[]),...(c?.pickupEnabled?[{title:"Pickup available",detail:c.pickupNote||"Choose pickup at checkout"}]:[]),...(c?.paymentMethods.cashOnDelivery?[{title:"Cash on delivery",detail:"Available at checkout"}]:[]),...(c?.paymentMethods.bankTransfer?[{title:"Bank transfer",detail:"Available at checkout"}]:[]),...(c?.paymentMethods.payOnPickup?[{title:"Pay on pickup",detail:"Available at checkout"}]:[]),...(c?.returnPolicy?[{title:"Returns",detail:c.returnPolicy}]:[])];return trust.length>0?<section className={styles.storeTrustGrid} style={{order:orderOf("trust")}} aria-label="Store information">{trust.map(item=><article key={item.title}><strong>{item.title}</strong><span>{item.detail}</span></article>)}</section>:null;})()}

        {isOnlineStore && onSaleProducts.length>0 && <section className={styles.section} style={{order:orderOf("onsale")}}><div className={styles.catalogueHead}><h2 className={styles.sectionHeading}>On sale</h2><a className={styles.myOrdersLink} href="#catalogue">See all</a></div><div className={styles.featuredRow}>{onSaleProducts.slice(0,8).map(product=><StoreProductCard key={product.id} product={product} to={`/${business.slug}/p/${product.slug}`} onAdd={()=>handleAdd(product)} className={styles.featuredCard}/>)}</div></section>}

        {isOnlineStore && newArrivals.length>0 && <section className={styles.section} style={{order:orderOf("new")}}><div className={styles.catalogueHead}><h2 className={styles.sectionHeading}>New arrivals</h2><a className={styles.myOrdersLink} href="#catalogue">See all</a></div><div className={styles.featuredRow}>{newArrivals.map(product=><StoreProductCard key={product.id} product={product} to={`/${business.slug}/p/${product.slug}`} onAdd={()=>handleAdd(product)} className={styles.featuredCard}/>)}</div></section>}

        {sections.video !== false && (homepageVideoUrl || homepageVideoFileUrl) && <section className={styles.videoSection} style={{ order: orderOf(videoInHero ? "hero" : "video") }}>
          <h2 className={styles.sectionHeading}>{typeof content.homepageVideoTitle === "string" && content.homepageVideoTitle.trim() ? content.homepageVideoTitle : "Watch our video"}</h2>
          {typeof content.homepageVideoDescription === "string" && content.homepageVideoDescription.trim() && <p className={styles.prose}>{content.homepageVideoDescription}</p>}
          <div className={styles.videoFrame}>
            {homepageVideoFileUrl ? <video src={homepageVideoFileUrl} controls playsInline preload="metadata" /> : <iframe src={homepageVideoUrl ?? ""} title={`${business.name} video`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />}
          </div>
        </section>}

        {sections.events !== false && events.length > 0 && <section className={styles.section} id="events" style={{ order: orderOf("events") }}>
          <div className={styles.catalogueHead}><h2 className={styles.sectionHeading}>Upcoming events</h2><span>{events.length} upcoming</span></div>
          <div className={`${styles.featuredRow} ${styles.eventsRow}`}>{events.map(event=><article key={event.id} className={`${styles.featuredCard} ${styles.eventCard}`}>
            {event.coverImageUrl&&<div className={styles.eventMedia}><img src={event.coverImageUrl} alt="" loading="lazy" decoding="async"/></div>}
            <strong>{event.title}</strong><span>{new Date(event.startsAt).toLocaleString(undefined,{weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}</span>{event.venue&&<span>{event.venue}</span>}
            <Button asChild size="sm"><Link to={`/${business.slug}/e/${event.slug}`}>{event.registrationEnabled?"View event & register":"View event"}</Link></Button>
          </article>)}</div>
        </section>}

        {sections.gallery !== false && galleries.length > 0 && (
          <section className={styles.section} id="gallery" style={{ order: orderOf("gallery") }}>
            <div className={styles.catalogueHead}><h2 className={styles.sectionHeading}>Gallery</h2><Link className={styles.myOrdersLink} to={"/" + business.slug + "/g/" + galleries[0].slug}>View all</Link></div>
            <div className={`${styles.featuredRow} ${styles.galleryRow}`}>{galleries.slice(0,6).map(g => <Link key={g.id} to={"/" + business.slug + "/g/" + g.slug} className={`${styles.featuredCard} ${styles.galleryCard}`}><div className={styles.galleryMedia}>{g.coverImageUrl ? <img src={g.coverImageUrl} alt={g.name} loading="lazy" decoding="async"/> : null}</div><strong>{g.name}</strong><span>{g.imageCount} {g.imageCount === 1 ? "photo" : "photos"}</span></Link>)}</div>
          </section>
        )}

        {sections.services !== false && services.length > 0 && (
          <section className={styles.section} id="services" style={{ order: orderOf("services") }}>
            <h2 className={styles.sectionHeading}>Services</h2>
            <div className={styles.serviceGrid}>
              {services.map((service) => <StoreServiceCard key={service.id} service={service} businessSlug={business.slug} />)}
            </div>
          </section>
        )}

        {myOrders.forThisShop.length > 0 && (
          <div className={styles.myOrdersBar} style={{ order: 90 }}>
            <span>
              You have {myOrders.forThisShop.length}{" "}
              {myOrders.forThisShop.length === 1 ? "order" : "orders"} with this
              shop.
            </span>
            <Link
              className={styles.myOrdersLink}
              to={`/${business.slug}/track/${myOrders.forThisShop[0].code}`}
            >
              Check the latest
            </Link>
          </div>
        )}

        {sections.featured && featured.length > 0 && !isService && (
          <section className={styles.section} style={{ order: orderOf("featured") }} aria-labelledby="featured-heading">
            <h2 className={styles.sectionHeading} id="featured-heading">
              Featured
            </h2>
            <div className={styles.featuredRow}>
              {featured.map((product) => (
                <StoreProductCard
                  key={product.id}
                  product={product}
                  to={`/${business.slug}/p/${product.slug}`}
                  onAdd={() => handleAdd(product)}
                  className={styles.featuredCard}
                />
              ))}
            </div>
          </section>
        )}

        {sections.catalogue !== false && <section className={styles.section} id="catalogue" style={{ order: orderOf("catalogue") }}>
          <div className={styles.catalogueHead}>
            <h2 className={styles.sectionHeading}>
              {isService && services.length > 0 ? "Products" : isService ? "What we do" : "Products & Services"}
            </h2>
            {!isOnlineStore && <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <Input
                className={styles.searchInput}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setVisibleCount(12);
                }}
                placeholder={products.length === 0 && isService ? "Search services" : "Search products"}
                aria-label="Search"
              />
            </div>}
          </div>

          {categories.length > 0 && (
            <div className={styles.chips}>
              <button
                type="button"
                className={`${styles.chip} ${activeCategory === null ? styles.chipActive : ""}`}
                onClick={() => {
                  setActiveCategory(null);
                  setVisibleCount(12);
                }}
              >
                All ({products.length})
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`${styles.chip} ${activeCategory === category.id ? styles.chipActive : ""}`}
                  onClick={() => {
                    setActiveCategory(category.id);
                    setVisibleCount(12);
                  }}
                >
                  {category.name} ({categoryCounts.get(category.id) ?? 0})
                </button>
              ))}
            </div>
          )}

          {products.length > 1 && (
            <div className={styles.toolbar}>
              <span className={styles.resultCount}>
                {visibleProducts.length} {visibleProducts.length === 1 ? "item" : "items"}
              </span>
              <Select
                value={sort}
                onValueChange={(value) => {
                  setSort(value as typeof sort);
                  setVisibleCount(12);
                }}
              >
                <SelectTrigger className={styles.sortTrigger} aria-label="Sort products">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Default order</SelectItem>
                  <SelectItem value="price_asc">Price: low to high</SelectItem>
                  <SelectItem value="price_desc">Price: high to low</SelectItem>
                  <SelectItem value="name">Name: A to Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {visibleProducts.length > 0 ? (
            <>
              <div className={isService ? styles.rows : styles.grid}>
                {visibleProducts.slice(0, visibleCount).map((product) => (
                  <StoreProductCard
                    key={product.id}
                    product={product}
                    to={business.canUseProductLinks ? `/${business.slug}/p/${product.slug}` : undefined}
                    layout={isService ? "row" : "grid"}
                    onAdd={() => handleAdd(product)}
                  />
                ))}
              </div>
              {visibleProducts.length > visibleCount && (
                <div className={styles.showMoreRow}>
                  <Button variant="outline" onClick={() => setVisibleCount((count) => count + 12)}>
                    Show more ({visibleProducts.length - visibleCount} left)
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>
                {products.length === 0
                  ? "This shop has not listed anything yet."
                  : "Nothing matches that search."}
              </p>
              <p className={styles.emptyBody}>
                {products.length === 0
                  ? "Message the business directly and ask what is available."
                  : "Try a different word, or message the shop and ask."}
              </p>
              {whatsappNumber && (
                <Button asChild variant="outline">
                  <a href={enquiryUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle size={16} />
                    Ask on WhatsApp
                  </a>
                </Button>
              )}
            </div>
          )}
        </section>}

        {sections.about !== false && business.description && (
          <section className={styles.section} id="about" style={{ order: orderOf("about") }}>
            <h2 className={styles.sectionHeading}>About</h2>
            <p className={styles.prose}>{business.description}</p>
          </section>
        )}

        {sections.work !== false && portfolio.length > 0 && (
          <section className={styles.section} id="work" style={{ order: orderOf("work") }}>
            <h2 className={styles.sectionHeading}>Recent work</h2>
            <div className={styles.workGrid}>
              {portfolio.map((item) => {
                const card = (
                  <>
                    <div className={styles.workMedia}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className={styles.workImage}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                    </div>
... (output capped at 40000 chars — continue with read_file path: "pages/store.$slug.tsx" offset: 599)
