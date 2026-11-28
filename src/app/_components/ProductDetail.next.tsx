"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  ImageOff,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Skeleton } from "../../../components/Skeleton";
import { StorefrontHeaderNext } from "./StorefrontHeader.next";
import { StoreCartDockNext } from "./StoreCartDock.next";
import { EngagementSection } from "../../../components/EngagementSection";
import { VariantOptions } from "../../../components/VariantOptions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/Accordion";
import { formatMoney } from "../../../helpers/formatMoney";
import { buildWhatsAppOrderUrl } from "../../../helpers/buildWhatsAppOrderUrl";
import { resolveVariantSelection } from "../../../helpers/resolveVariantSelection";
import { useStoreCart } from "../../../helpers/useStoreCart";
import { trackStoreEvent } from "../../../helpers/trackStoreEvent";
import { storeThemeEngine } from "../../../helpers/storeThemeEngine";
import styles from "../../../legacy-pages/store.$slug.p.$productSlug.module.css";

type Props = { data: import("../../../endpoints/storefront_GET.schema").OutputType; productSlug: string; customDomain: boolean; origin: string };
const ProductDetailNext = ({ data, productSlug, customDomain, origin }: Props) => {
  const slug = data.business.slug;
  const path = (suffix: string) => customDomain ? (suffix || "/") : `/${encodeURIComponent(slug)}${suffix}`;
  const router = useRouter();
  const isFetching = false;
  const error = null;
  const cart = useStoreCart(slug);

  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [highlight, setHighlight] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);

  const product = data?.products.find((item) => item.slug === productSlug);
  const productId = product?.id;

  useEffect(() => {
    if (data?.business && product) {
      trackStoreEvent("product_view", {
        businessSlug: data.business.slug,
        productSlug: product.slug,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.business?.slug, productId]);

  // A new product starts from a clean slate.
  useEffect(() => {
    setSelected({});
    setHighlight(null);
    setQuantity(1);
    setActiveImage(0);
  }, [productId]);

  const resolved = useMemo(
    () =>
      product
        ? resolveVariantSelection(product.price, product.variants ?? [], selected)
        : null,
    [product, selected],
  );

  if (isFetching && !data) {
    return (
      <div className={styles.page}>
        <Skeleton className={styles.skeletonImage} />
        <Skeleton className={styles.skeletonTitle} />
        <Skeleton className={styles.skeletonLine} />
      </div>
    );
  }

  if (error || !data || !product || !resolved) {
    return (
      <div className={styles.page}>
        <h1 className={styles.notFoundTitle}>Item not found</h1>
        <p className={styles.body}>This item may have been removed or renamed.</p>
        {data && (
          <Button asChild variant="outline">
            <Link href={path("")}>
              <ArrowLeft size={16} />
              Back to the shop
            </Link>
          </Button>
        )}
      </div>
    );
  }

  const business = data.business;
  const checkout = business.checkout;
  const appearance = business.appearanceSettings ?? {};
  const theme = storeThemeEngine(business.themeId, appearance);
  const homePage = typeof appearance.homePage === "string" ? appearance.homePage : "home";
  const footerMode =
    appearance.footerMode === "none" || appearance.footerMode === "selected"
      ? appearance.footerMode
      : "all";
  const footerPages = Array.isArray(appearance.footerPages)
    ? appearance.footerPages.filter((x): x is string => typeof x === "string")
    : [];
  const showFooter =
    footerMode === "all" ||
    (footerMode === "selected" && footerPages.includes("product-detail"));

  if (!business.canUseProductLinks) {
    return (
      <div className={styles.page}>
        <h1 className={styles.notFoundTitle}>Product link unavailable</h1>
        <p className={styles.body}>
          Direct product links are available on Premium. You can still browse this
          business from its main storefront.
        </p>
        <Button asChild variant="outline">
          <Link href={path("")}>Back to the shop</Link>
        </Button>
      </div>
    );
  }

  const home = path("");
  const whatsappNumber = business.whatsappNumber ?? business.phone ?? "";
  // Exact stock counts stay private; the public catalogue exposes availability only.
  const inStock = product.available;
  const maxQuantity = 99;
  const qty = Math.min(quantity, maxQuantity);

  const unitPrice = resolved.price;
  const showWas =
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > unitPrice &&
    unitPrice === product.price;
  const percentOff = showWas
    ? Math.round((1 - unitPrice / (product.compareAtPrice as number)) * 100)
    : 0;
  const hasOptions = resolved.groups.length > 0;
  const priceStartsAt =
    hasOptions && resolved.chosen.length === 0
      ? Math.min(
          product.price,
          ...resolved.groups.flatMap((group) =>
            group.options.map((option) => option.price ?? product.price),
          ),
        )
      : null;

  const images = [product.imageUrl, ...(product.images ?? [])].filter(
    (url, index, all): url is string => Boolean(url) && all.indexOf(url) === index,
  );
  const mainImage = images[Math.min(activeImage, images.length - 1)] ?? null;

  const description = product.description ?? `${product.name} from ${business.name}.`;
  const categoryName =
    data.categories.find((category) => category.id === product.categoryId)?.name ?? null;

  const sameCategory = data.products.filter(
    (item) =>
      item.id !== product.id &&
      product.categoryId !== null &&
      item.categoryId === product.categoryId,
  );
  const others = data.products.filter(
    (item) => item.id !== product.id && !sameCategory.includes(item),
  );
  const related = [...sameCategory, ...others].slice(0, 4);

  const buildCartItem = () => ({
    productId: product.id,
    name: product.name,
    price: unitPrice,
    currency: product.currency,
    imageUrl: product.imageUrl,
    variants: hasOptions ? resolved.chosen : undefined,
    variantLabel: hasOptions ? resolved.label || null : undefined,
    maxQuantity: null,
  });

  /** Returns true when the item went into the cart. */
  const addToCart = (): boolean => {
    if (!inStock) return false;
    if (resolved.missingGroup) {
      setHighlight(resolved.missingGroup);
      toast.error(`Choose a ${resolved.missingGroup} first.`);
      return false;
    }
    cart.add(buildCartItem(), qty);
    return true;
  };

  const orderUrl = buildWhatsAppOrderUrl({
    businessName: business.name,
    whatsappNumber,
    currency: business.currency,
    items: [
      {
        name: resolved.label ? `${product.name} (${resolved.label})` : product.name,
        quantity: qty,
        unitPrice,
      },
    ],
  });

  const shareUrl = new URL(`/_api/share/page?slug=${encodeURIComponent(business.slug)}&kind=product&id=${encodeURIComponent(product.slug)}`, origin).toString();
  const share = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title: product.name, url: shareUrl }).catch(() => {});
      return;
    }
    void navigator.clipboard
      .writeText(shareUrl)
      .then(() => toast.success("Link copied."))
      .catch(() => toast.error("Could not copy the link."));
  };

  // What delivery and payment look like in this shop, for the info accordion.
  const zoneFees = checkout?.zones.map((zone) => zone.fee) ?? [];
  const cheapest = zoneFees.length ? Math.min(...zoneFees) : null;
  const paymentNames: string[] = [];
  if (checkout?.paymentMethods.cashOnDelivery) paymentNames.push("pay on delivery");
  if (checkout?.paymentMethods.payOnPickup) paymentNames.push("pay on pickup");
  if (checkout?.paymentMethods.bankTransfer) paymentNames.push("bank transfer");

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    ...(images.length ? { image: images } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency,
      price: product.price,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  }).replace(/</g, "\\u003c");

  const stockBadge = !inStock ? (
    <Badge variant="secondary">Out of stock</Badge>
  ) : (
    <Badge variant="success">In stock</Badge>
  );

  return (
    <div className={styles.page} style={theme.style as React.CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />


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
          { label: "Home", href: homePage === "home" ? path("") : path(`/${homePage}`) },
          { label: "Products", href: path("/products"), active: true },
          ...(data.services.length ? [{ label: "Services", href: path("/services") }] : []),
          { label: "About", href: path("/about") },
          ...(data.blogPosts.length ? [{ label: "Blog", href: path("/blog") }] : []),
          ...(data.events.length && appearance.eventsPageInMenu === true
            ? [{ label: "Events", href: path("/events") }]
            : []),
          { label: "Contact", href: path("/contact") },
          { label: "Track order", href: path("/track") },
        ]}
      />

      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link href={path("")}>{business.name}</Link>
        <ChevronRight size={14} />
        <Link href={path("/products")}>Products</Link>
        {categoryName && (
          <>
            <ChevronRight size={14} />
            <span>{categoryName}</span>
          </>
        )}
        <ChevronRight size={14} />
        <span aria-current="page" className={styles.crumbCurrent}>{product.name}</span>
      </nav>

      <div className={styles.layout}>
        <div className={styles.gallery}>
          <div className={styles.media}>
            {mainImage ? (
              <img src={mainImage} alt={product.name} className={styles.image} />
            ) : (
              <div className={styles.placeholder}>
                <ImageOff size={28} />
              </div>
            )}
            {showWas && percentOff > 0 && inStock && (
              <Badge variant="destructive" className={styles.saleBadge}>
                −{percentOff}%
              </Badge>
            )}
            {!inStock && <div className={styles.soldOutOverlay}>Out of stock</div>}
          </div>
          {images.length > 1 && (
            <div className={styles.thumbs} role="list" aria-label="Product images">
              {images.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  role="listitem"
                  className={`${styles.thumb} ${index === activeImage ? styles.thumbOn : ""}`}
                  onClick={() => setActiveImage(index)}
                  aria-label={`Show image ${index + 1}`}
                  aria-current={index === activeImage}
                >
                  <img src={url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.details}>
          <div className={styles.badges}>
            {product.featured && <Badge variant="warning">Featured</Badge>}
            {stockBadge}
          </div>

          {categoryName && <span className={styles.category}>{categoryName}</span>}
          <h1 className={styles.name}>{product.name}</h1>

          <div className={styles.priceRow}>
            {priceStartsAt !== null && <span className={styles.from}>From</span>}
            <span className={styles.price}>
              {formatMoney(priceStartsAt ?? unitPrice, product.currency)}
              {product.unit ? " / " + product.unit : ""}
            </span>
            {showWas && (
              <s className={styles.was}>
                {formatMoney(product.compareAtPrice as number, product.currency)}
              </s>
            )}
          </div>

          {product.description && <p className={styles.body}>{product.description}</p>}

          {hasOptions && (
            <VariantOptions
              groups={resolved.groups}
              selected={selected}
              highlightGroup={highlight}
              currency={product.currency}
              onSelect={(group, value) => {
                setHighlight(null);
                setSelected((current) => ({ ...current, [group]: value }));
              }}
            />
          )}

          {inStock ? (
            <div className={styles.buyBox}>
              <div className={styles.quantityRow}>
                <span>Quantity</span>
                <div className={styles.quantityControl}>
                  <Button type="button" variant="outline" size="icon-sm" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQuantity(Math.max(1, qty - 1))}>
                    <Minus size={14} />
                  </Button>
                  <strong>{qty}</strong>
                  <Button type="button" variant="outline" size="icon-sm" aria-label="Increase quantity" disabled={qty >= maxQuantity} onClick={() => setQuantity(Math.min(maxQuantity, qty + 1))}>
                    <Plus size={14} />
                  </Button>
                </div>
                <strong className={styles.lineTotal}>
                  {formatMoney(unitPrice * qty, product.currency)}
                </strong>
              </div>

              <div className={styles.productActions}>
                <Button
                  size="lg"
                  className={styles.orderButton}
                  onClick={() => {
                    if (addToCart()) {
                      toast.success("Added to your cart.");
                      setCartOpen(true);
                    }
                  }}
                >
                  <ShoppingBag size={17} />
                  Add to cart
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className={styles.orderButton}
                  onClick={() => {
                    if (addToCart()) router.push(path("/checkout"));
                  }}
                >
                  <Check size={17} />
                  Buy now
                </Button>
              </div>
            </div>
          ) : (
            <p className={styles.note}>
              This item is sold out right now. Message the shop to ask when it is back.
            </p>
          )}

          <div className={styles.secondaryActions}>
            {whatsappNumber && (
              <Button asChild variant="ghost" size="sm">
                <a href={orderUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={15} />
                  Ask on WhatsApp
                </a>
              </Button>
            )}
          </div>

          <Accordion type="multiple" defaultValue={["delivery"]} className={styles.accordion}>
            {checkout && (checkout.deliveryEnabled || checkout.pickupEnabled) && (
              <AccordionItem value="delivery">
                <AccordionTrigger>
                  <span className={styles.accordionTitle}><Truck size={15} /> Delivery &amp; payment</span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className={styles.infoList}>
                    {checkout.deliveryEnabled && (
                      <li>
                        {cheapest !== null
                          ? `Delivery from ${cheapest === 0 ? "free" : formatMoney(cheapest, business.currency)} to ${checkout.zones.length} ${checkout.zones.length === 1 ? "area" : "areas"}.`
                          : "Delivery available — the shop confirms the cost with you."}
                      </li>
                    )}
                    {checkout.freeDeliveryOver !== null && (
                      <li>Free delivery on orders over {formatMoney(checkout.freeDeliveryOver, business.currency)}.</li>
                    )}
                    {checkout.deliveryNote && <li>{checkout.deliveryNote}</li>}
                    {checkout.pickupEnabled && (
                      <li>Pickup available{checkout.pickupNote ? ` — ${checkout.pickupNote}` : "."}</li>
                    )}
                    {paymentNames.length > 0 && <li>Payment: {paymentNames.join(", ")}.</li>}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}
            {checkout?.returnPolicy && (
              <AccordionItem value="returns">
                <AccordionTrigger>Returns &amp; refunds</AccordionTrigger>
                <AccordionContent>
                  <p className={styles.infoText}>{checkout.returnPolicy}</p>
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="seller">
              <AccordionTrigger>About {business.name}</AccordionTrigger>
              <AccordionContent>
                <p className={styles.infoText}>
                  {business.description ?? `Sold by ${business.name}.`}
                  {business.address ? ` ${business.address}.` : ""}
                  {business.openingHours ? ` Open ${business.openingHours}.` : ""}
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <EngagementSection slug={business.slug} targetType="product" targetId={product.id} contextTitle={product.name} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 24, padding: "12px 14px", border: "1px solid var(--border)", borderRadius: "var(--store-card-radius, 10px)" }}>
            <span style={{ fontWeight: 650 }}>Share this product</span>
            <span style={{ display: "inline-flex", gap: 8 }}>
              <Button variant="outline" size="sm" onClick={share}>
                <Share2 size={15} />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(shareUrl)
                    .then(() => toast.success("Link copied."))
                    .catch(() => toast.error("Could not copy the link."));
                }}
              >
                <Copy size={15} />
                Copy link
              </Button>
            </span>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relatedHeading}>
            {sameCategory.length > 0 && categoryName
              ? `More in ${categoryName}`
              : `More from ${business.name}`}
          </h2>
          <div className={styles.relatedGrid}>
            {related.map((item) => (
              <Link key={item.id} href={path(`/p/${item.slug}`)} className={styles.relatedCard}>
                <div className={styles.relatedMedia}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className={styles.relatedImage} loading="lazy" decoding="async" />
                  ) : (
                    <ImageOff size={18} className={styles.relatedIcon} />
                  )}
                  {!item.available && <span className={styles.relatedSoldOut}>Out of stock</span>}
                </div>
                <span className={styles.relatedName}>{item.name}</span>
                <span className={styles.relatedPrice}>
                  {formatMoney(item.price, item.currency)}
                  {typeof item.compareAtPrice === "number" && (
                    <s className={styles.relatedWas}>{formatMoney(item.compareAtPrice, item.currency)}</s>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {showFooter && (
        <footer className={styles.storeFooter}>
          <Link href={homePage === "home" ? path("") : path(`/${homePage}`)}>Home</Link>
          <span>© {new Date().getFullYear()} {business.name}</span>
        </footer>
      )}

      <StoreCartDockNext
        slug={business.slug}
        customDomain={customDomain}
        currency={business.currency}
        cart={cart}
        open={cartOpen}
        onOpenChange={setCartOpen}
      />
    </div>
  );
};

export default ProductDetailNext;

