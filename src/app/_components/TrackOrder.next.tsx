"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Check, Landmark, MessageCircle, Phone, Store } from "lucide-react";
import { Button } from "../../../components/Button";
import { Badge } from "../../../components/Badge";
import { Skeleton } from "../../../components/Skeleton";
import { formatMoney } from "../../../helpers/formatMoney";
import { buildWhatsAppReplyUrl } from "../../../helpers/buildWhatsAppReplyUrl";
import { useTrackedOrder } from "../../../helpers/useTrackedOrder";
import { storeThemeEngine } from "../../../helpers/storeThemeEngine";
import { StorefrontHeaderNext } from "./StorefrontHeader.next";
import type { ShippingStatus } from "../../../helpers/schema";
import styles from "../../../pages/track.$code.module.css";

const shippingSteps: { id: ShippingStatus; label: string; blurb: string }[] = [
  { id: "preparing", label: "Preparing", blurb: "The shop is getting your items ready." },
  { id: "shipped", label: "Shipped", blurb: "Your order has left the shop." },
  { id: "out_for_delivery", label: "Out for delivery", blurb: "On its way to you now." },
  { id: "delivered", label: "Delivered", blurb: "This order has been delivered." },
];
const paymentLabels = { cash_on_delivery: "Pay on delivery", pay_on_pickup: "Pay on pickup", bank_transfer: "Bank transfer", online: "Paid online" } as const;

export default function TrackOrderNext({ code, expectedSlug, customDomain = false }: { code: string; expectedSlug?: string; customDomain?: boolean }) {
  const { data, isFetching, error } = useTrackedOrder(code);
  if (isFetching && !data) return <main className={styles.page}><Skeleton className={styles.skeletonTitle}/><Skeleton className={styles.skeletonBlock}/></main>;
  if (error || !data) return <main className={styles.page}><h1 className={styles.title}>Order not found</h1><p className={styles.body}>{error instanceof Error ? error.message : "No order matches that code."}</p><Button asChild variant="outline"><Link href={customDomain ? "/track" : "/track"}>Try another code</Link></Button></main>;

  const { order, business, recommended } = data;
  const root = customDomain ? "" : `/${business.slug}`;
  if (expectedSlug && expectedSlug !== business.slug) return <main className={styles.page}><h1 className={styles.title}>Order link does not match this business</h1><p className={styles.body}>Open the tracking link provided by the business that received your order.</p><Button asChild variant="outline"><Link href={`/${business.slug}`}>Visit {business.name}</Link></Button></main>;
  const isCollection = order.shippingStatus === "not_required";
  const currentIndex = shippingSteps.findIndex(step => step.id === order.shippingStatus);
  const whatsapp = business.whatsappNumber ?? business.phone ?? "";
  const theme = storeThemeEngine(business.themeId ?? "clean", business.appearanceSettings ?? {});
  const appearance = business.appearanceSettings ?? {};
  const homePage = typeof appearance.homePage === "string" ? appearance.homePage : "home";
  const home = homePage === "home" ? root || "/" : `${root}/${homePage}`;
  const navItems = (appearance.siteMode === "multi_page"
    ? [{ label: "Home", href: home }, { label: "About", href: `${root}/about` }, { label: "Products", href: `${root}/products` }, { label: "Services", href: `${root}/services` }, { label: "Contact", href: `${root}/contact` }]
    : [{ label: "Home", href: home }, { label: "Products", href: `${root}#catalogue` }, { label: "Services", href: `${root}#services` }, { label: "Contact", href: `${root}#contact` }]).concat([{ label: "Track another order", href: "/track" }]);
  return <div className={styles.site} style={theme.style as React.CSSProperties}>
    <StorefrontHeaderNext businessName={business.name} logoUrl={business.logoUrl} tagline={typeof appearance.headerTagline === "string" ? appearance.headerTagline : "Order tracking"} headerBrand={typeof appearance.headerBrand === "string" ? appearance.headerBrand : "logo_name"} headerAlignment={theme.headerAlignment} menuStyle={theme.menuStyle as "bar" | "minimal" | "pills"} menuPosition={theme.menuPosition as "left" | "center" | "right"} menuVisibility="always" showActions={false} navItems={navItems}/>
    <main className={styles.content}>
      <header className={styles.head}>
        <Link href={home} className={styles.shopLink}><Store size={15}/>{business.name}</Link>
        <h1 className={styles.title}>Order {order.trackingCode}</h1>
        <p className={styles.body}>Placed {new Date(order.createdAt).toLocaleDateString()} for {order.customerName}.</p>
        <div className={styles.badges}>
          <Badge variant={order.status === "completed" ? "success" : order.status === "cancelled" ? "secondary" : "warning"}>{order.status}</Badge>
          {isCollection && <Badge variant="secondary">For collection</Badge>}
          {order.paymentMethod && <Badge variant={order.paymentStatus === "paid" ? "success" : "warning"}>{paymentLabels[order.paymentMethod]} · {order.paymentStatus ?? "unpaid"}</Badge>}
        </div>
      </header>
      {!isCollection && <section className={styles.progress}>{shippingSteps.map((step, index) => { const done = index <= currentIndex; return <div key={step.id} className={`${styles.step} ${done ? styles.stepDone : ""}`}><span className={styles.stepMarker}>{done ? <Check size={13}/> : index + 1}</span><div className={styles.stepText}><span className={styles.stepLabel}>{step.label}</span>{index === currentIndex && <span className={styles.stepBlurb}>{step.blurb}</span>}</div></div>; })}</section>}
      {order.ownerNote && <p className={styles.note}><strong>From the shop:</strong> {order.ownerNote}</p>}
      <section className={styles.summary}><h2 className={styles.sectionHeading}>Your items</h2><ul className={styles.lines}>{order.items.map((line, index) => <li key={`${line.name}-${index}`} className={styles.line}><span>{line.quantity} × {line.name}{line.variantLabel ? ` (${line.variantLabel})` : ""}</span><span className={styles.lineTotal}>{formatMoney(line.lineTotal, order.currency)}</span></li>)}</ul>
        {typeof order.deliveryFee === "number" && order.deliveryFee > 0 && <div className={styles.line}><span>Delivery{order.deliveryZone ? ` — ${order.deliveryZone}` : ""}</span><span className={styles.lineTotal}>{formatMoney(order.deliveryFee, order.currency)}</span></div>}
        <div className={styles.totalRow}><span>Total</span><span className={styles.total}>{formatMoney(order.totalAmount, order.currency)}</span></div>{order.deliveryAddress && <p className={styles.address}>Delivering to {order.deliveryAddress}</p>}
      </section>
      {order.bank?.accountNumber && <section className={styles.summary}><h2 className={styles.sectionHeading}><Landmark size={16}/> Pay by bank transfer</h2><p className={styles.address}>{[order.bank.bankName, order.bank.accountName].filter(Boolean).join(" · ")}</p><p className={styles.address}>Account number <strong>{order.bank.accountNumber}</strong>. Use <strong>{order.trackingCode}</strong> as the reference, then send your proof of payment to the shop.</p></section>}
      {whatsapp && <section className={styles.contact}><h2 className={styles.sectionHeading}>Need to change something?</h2><div className={styles.contactRow}><Button asChild><a href={buildWhatsAppReplyUrl({ phone: whatsapp, message: `Hello ${business.name}, I am asking about order ${order.trackingCode}.` })} target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/> Message the shop</a></Button>{business.phone && <Button asChild variant="outline"><a href={`tel:${business.phone.replace(/\\s/g, "")}`}><Phone size={16}/> Call</a></Button>}</div></section>}
      {recommended.length > 0 && <section className={styles.related}><h2 className={styles.sectionHeading}>You might also like</h2><div className={styles.relatedGrid}>{recommended.map(item => <Link key={item.id} href={customDomain ? `/p/${item.slug}` : `/${business.slug}/p/${item.slug}`} className={styles.relatedCard}><div className={styles.relatedMedia}>{item.imageUrl ? <img src={item.imageUrl} alt="" className={styles.relatedImage} loading="lazy"/> : null}</div><span className={styles.relatedName}>{item.name}</span><span className={styles.relatedPrice}>{formatMoney(item.price, item.currency)}</span></Link>)}</div><Button asChild variant="outline" className={styles.shopAll}><Link href={home}>Back to the shop</Link></Button></section>}
    </main>
    {appearance.footerMode !== "none" && <footer className={styles.footer}>Order tracking · {business.name}</footer>}
  </div>;
}
