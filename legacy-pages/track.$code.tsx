import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Check, ImageOff, Landmark, MessageCircle, Phone, Store } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { formatMoney } from "../helpers/formatMoney";
import { buildWhatsAppReplyUrl } from "../helpers/buildWhatsAppReplyUrl";
import { useTrackedOrder } from "../helpers/useTrackedOrder";
import { storeThemeEngine } from "../helpers/storeThemeEngine";
import type { ShippingStatus } from "../helpers/schema";
import styles from "./track.$code.module.css";

const shippingSteps: { id: ShippingStatus; label: string; blurb: string }[] = [
  { id: "preparing", label: "Preparing", blurb: "The shop is getting your items ready." },
  { id: "shipped", label: "Shipped", blurb: "Your order has left the shop." },
  { id: "out_for_delivery", label: "Out for delivery", blurb: "On its way to you now." },
  { id: "delivered", label: "Delivered", blurb: "This order has been delivered." },
];

const paymentLabels = {
  cash_on_delivery: "Pay on delivery",
  pay_on_pickup: "Pay on pickup",
  bank_transfer: "Bank transfer",
  online: "Paid online",
} as const;

const TrackOrderPage = () => {
  const { code, slug } = useParams<{ code: string; slug?: string }>();
  const { data, isFetching, error } = useTrackedOrder(code);

  if (isFetching && !data) {
    return (
      <div className={styles.page}>
        <Skeleton className={styles.skeletonTitle} />
        <Skeleton className={styles.skeletonBlock} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Order not found</h1>
        <p className={styles.body}>
          {error instanceof Error
            ? error.message
            : "No order matches that code."}
        </p>
        <Button asChild variant="outline">
          <Link to="/track">Try another code</Link>
        </Button>
      </div>
    );
  }

  const { order, business, recommended } = data;
  const isCollection = order.shippingStatus === "not_required";
  const currentIndex = shippingSteps.findIndex(
    (step) => step.id === order.shippingStatus,
  );
  const whatsapp = business.whatsappNumber ?? business.phone ?? "";
  const theme = storeThemeEngine(business.themeId ?? "clean", business.appearanceSettings ?? {});
  const appearance=business.appearanceSettings??{};
  const homePage=typeof appearance.homePage==="string"?appearance.homePage:"home";
  const footerMode=appearance.footerMode==="none"||appearance.footerMode==="selected"?appearance.footerMode:"all";
  const footerPages=Array.isArray(appearance.footerPages)?appearance.footerPages.filter((x):x is string=>typeof x==="string"):[];
  const showFooter=footerMode==="all"||(footerMode==="selected"&&footerPages.includes("tracking"));
  if (slug && slug !== business.slug) return <div className={styles.page}><h1 className={styles.title}>Order link does not match this business</h1><p className={styles.body}>Open the tracking link provided by the business that received your order.</p><Button asChild variant="outline"><Link to={`/${business.slug}`}>Visit {business.name}</Link></Button></div>;

  return (
    <div className={styles.site} style={theme.style as React.CSSProperties}>
      <Helmet>
        <title>{`Order ${order.trackingCode} — ${business.name}`}</title>
        <meta name="robots" content="noindex" />
        <meta property="og:title" content={`Order ${order.trackingCode} — ${business.name}`} />
        <meta property="og:description" content={`Track your order from ${business.name}.`} />
        <meta property="og:image" content={typeof business.appearanceSettings?.shareImageUrl === "string" ? business.appearanceSettings.shareImageUrl : business.heroImageUrl || business.logoUrl || ""} />
      </Helmet>

      <header className={styles.siteHeader}>
        <Link to={homePage==="home"?`/${business.slug}`:`/${business.slug}/${homePage}`} className={styles.brand}>{business.appearanceSettings?.headerBrand !== "name" && business.appearanceSettings?.headerBrand !== "name_tagline" && business.logoUrl ? <img className={styles.brandLogo} src={business.logoUrl} alt=""/> : business.appearanceSettings?.headerBrand === "logo" ? <span className={styles.brandMark}>{business.name.charAt(0).toUpperCase()}</span> : null}<span>{business.appearanceSettings?.headerBrand !== "logo" && <strong>{business.name}</strong>}{(business.appearanceSettings?.headerBrand === "logo_name_tagline" || business.appearanceSettings?.headerBrand === "name_tagline" || typeof business.appearanceSettings?.headerTagline === "string") && typeof business.appearanceSettings?.headerTagline === "string" && business.appearanceSettings.headerTagline ? <small>{business.appearanceSettings.headerTagline}</small> : <small>Order tracking</small>}</span></Link>
        <nav>{(business.appearanceSettings?.siteMode === "multi_page" ? [{ label: "Home", to: homePage==="home"?`/${business.slug}`:`/${business.slug}/${homePage}` }, { label: "About", to: `/${business.slug}/about` }, { label: "Products", to: `/${business.slug}/products` }, { label: "Services", to: `/${business.slug}/services` }, { label: "Gallery", to: `/${business.slug}/gallery` }, { label: "Blog", to: `/${business.slug}/blog` }, { label: "Contact", to: `/${business.slug}/contact` }] : [{ label: "Home", to: `/${business.slug}` }, { label: "Products", to: `/${business.slug}#catalogue` }, { label: "Services", to: `/${business.slug}#services` }, { label: "Gallery", to: `/${business.slug}#gallery` }, { label: "About", to: `/${business.slug}#about` }, { label: "Contact", to: `/${business.slug}#contact` }]).map((item) => <Link key={item.label} to={item.to}>{item.label}</Link>)}<Link to="/track">Track another order</Link></nav>
      </header>
      <main className={styles.content}>
      <header className={styles.head}>
        <Link to={`/${business.slug}`} className={styles.shopLink}>
          <Store size={15} />
          {business.name}
        </Link>
        <h1 className={styles.title}>Order {order.trackingCode}</h1>
        <p className={styles.body}>
          Placed {new Date(order.createdAt).toLocaleDateString()} for{" "}
          {order.customerName}.
        </p>
        <div className={styles.badges}>
          <Badge
            variant={
              order.status === "completed"
                ? "success"
                : order.status === "cancelled"
                  ? "secondary"
                  : "warning"
            }
          >
            {order.status}
          </Badge>
          {isCollection && <Badge variant="secondary">For collection</Badge>}
          {order.paymentMethod && (
            <Badge variant={order.paymentStatus === "paid" ? "success" : "warning"}>
              {paymentLabels[order.paymentMethod]} · {order.paymentStatus ?? "unpaid"}
            </Badge>
          )}
        </div>
      </header>

      {!isCollection && (
        <section className={styles.progress}>
          {shippingSteps.map((step, index) => {
            const done = index <= currentIndex;
            return (
              <div
                key={step.id}
                className={`${styles.step} ${done ? styles.stepDone : ""}`}
              >
                <span className={styles.stepMarker}>
                  {done ? <Check size={13} /> : index + 1}
                </span>
                <div className={styles.stepText}>
                  <span className={styles.stepLabel}>{step.label}</span>
                  {index === currentIndex && (
                    <span className={styles.stepBlurb}>{step.blurb}</span>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {order.ownerNote && (
        <p className={styles.note}>
          <strong>From the shop:</strong> {order.ownerNote}
        </p>
      )}

      <section className={styles.summary}>
        <h2 className={styles.sectionHeading}>Your items</h2>
        <ul className={styles.lines}>
          {order.items.map((line, index) => (
            <li key={`${line.name}-${index}`} className={styles.line}>
              <span>
                {line.quantity} × {line.name}
                {line.variantLabel ? ` (${line.variantLabel})` : ""}
              </span>
              <span className={styles.lineTotal}>
                {formatMoney(line.lineTotal, order.currency)}
              </span>
            </li>
          ))}
        </ul>
        {typeof order.deliveryFee === "number" && order.deliveryFee > 0 && (
          <div className={styles.line}>
            <span>Delivery{order.deliveryZone ? ` — ${order.deliveryZone}` : ""}</span>
            <span className={styles.lineTotal}>
              {formatMoney(order.deliveryFee, order.currency)}
            </span>
          </div>
        )}
        <div className={styles.totalRow}>
          <span>Total</span>
          <span className={styles.total}>
            {formatMoney(order.totalAmount, order.currency)}
          </span>
        </div>
        {order.deliveryAddress && (
          <p className={styles.address}>
            Delivering to {order.deliveryAddress}
          </p>
        )}
      </section>

      {order.bank && order.bank.accountNumber && (
        <section className={styles.summary}>
          <h2 className={styles.sectionHeading}>
            <Landmark size={16} /> Pay by bank transfer
          </h2>
          <p className={styles.address}>
            {[order.bank.bankName, order.bank.accountName].filter(Boolean).join(" · ")}
          </p>
          <p className={styles.address}>
            Account number <strong>{order.bank.accountNumber}</strong>. Use{" "}
            <strong>{order.trackingCode}</strong> as the reference, then send your proof of
            payment to the shop.
          </p>
        </section>
      )}

      {whatsapp && (
        <section className={styles.contact}>
          <h2 className={styles.sectionHeading}>Need to change something?</h2>
          <div className={styles.contactRow}>
            <Button asChild>
              <a
                href={buildWhatsAppReplyUrl({
                  phone: whatsapp,
                  message: `Hello ${business.name}, I am asking about order ${order.trackingCode}.`,
                })}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={16} />
                Message the shop
              </a>
            </Button>
            {business.phone && (
              <Button asChild variant="outline">
                <a href={`tel:${business.phone.replace(/\s/g, "")}`}>
                  <Phone size={16} />
                  Call
                </a>
              </Button>
            )}
          </div>
        </section>
      )}

      {recommended.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.sectionHeading}>You might also like</h2>
          <div className={styles.relatedGrid}>
            {recommended.map((item) => (
              <Link
                key={item.id}
                to={`/${business.slug}/p/${item.slug}`}
                className={styles.relatedCard}
              >
                <div className={styles.relatedMedia}>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className={styles.relatedImage}
                      loading="lazy"
                    />
                  ) : (
                    <ImageOff size={18} className={styles.relatedIcon} />
                  )}
                </div>
                <span className={styles.relatedName}>{item.name}</span>
                <span className={styles.relatedPrice}>
                  {formatMoney(item.price, item.currency)}
                </span>
              </Link>
            ))}
          </div>
          <Button asChild variant="outline" className={styles.shopAll}>
            <Link to={`/${business.slug}`}>Back to the shop</Link>
          </Button>
        </section>
      )}
      </main>
      {showFooter&&<footer className={styles.footer}>Order tracking · {business.name}</footer>}
    </div>
  );
};

export default TrackOrderPage;
