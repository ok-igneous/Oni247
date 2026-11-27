"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/Input";
import { Textarea } from "../../../components/Textarea";
import { postStorefrontEnquiry } from "../../../endpoints/storefront/enquiry_POST.schema";
import { storeThemeEngine } from "../../../helpers/storeThemeEngine";
import type { OutputType } from "../../../endpoints/storefront_GET.schema";
import { StorefrontHeaderNext } from "./StorefrontHeader.next";
import styles from "../../../pages/store.$slug.s.$serviceSlug.module.css";

type Props = { data: OutputType; serviceId: string; customDomain: boolean };

export default function ServiceDetailNext({ data, serviceId, customDomain }: Props) {
  const { business } = data;
  const service = data.services.find((item) => item.id === serviceId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const path = (suffix: string) => customDomain ? suffix : `/${encodeURIComponent(business.slug)}${suffix}`;
  const appearance = business.appearanceSettings ?? {};
  const homePage = typeof appearance.homePage === "string" ? appearance.homePage : "home";
  const home = homePage === "home" ? path("") : path(`/${homePage}`);

  if (!service) {
    return <main className={styles.page}><h1>Service not found</h1><p>This service may have been removed or is no longer published.</p><Link href={path("/services")}>Back to services</Link></main>;
  }

  const theme = storeThemeEngine(business.themeId, appearance);
  const footerMode = appearance.footerMode === "none" || appearance.footerMode === "selected" ? appearance.footerMode : "all";
  const footerPages = Array.isArray(appearance.footerPages) ? appearance.footerPages.filter((value): value is string => typeof value === "string") : [];
  const showFooter = footerMode === "all" || (footerMode === "selected" && footerPages.includes("service-detail"));
  const price = service.priceType === "contact" ? "Contact for price" : service.priceType === "fixed" ? service.price : `From ${service.price}`;
  const whatsapp = business.whatsappNumber?.replace(/\\D/g, "");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setSendError("");
    try {
      await postStorefrontEnquiry({
        slug: business.slug,
        customerName: name,
        customerPhone: phone || null,
        customerEmail: email || null,
        message: `Service enquiry: ${service.name}\\n${message}`,
      });
      setSent(true);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Could not send your enquiry. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.site} style={theme.style as React.CSSProperties}>
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
          ...(data.products.length ? [{ label: "Products", href: path("/products") }] : []),
          { label: "Services", href: path("/services"), active: true },
          { label: "About", href: path("/about") },
          ...(data.events.length && appearance.eventsPageInMenu === true ? [{ label: "Events", href: path("/events") }] : []),
          { label: "Contact", href: path("/contact") },
        ]}
      />
      <main className={styles.content}>
        <Link className={styles.back} href={path("/services")}><ArrowLeft size={16} /> All services</Link>
        {service.imageUrl && <img className={styles.cover} src={service.imageUrl} alt={service.name} />}
        <p className={styles.eyebrow}>{service.category || "Service"}</p>
        <h1>{service.name}</h1>
        <p className={styles.price}>{price}</p>
        {service.duration && <p className={styles.duration}>Typical duration: {service.duration}</p>}
        <div className={styles.description}>{service.description || "Contact the business for more information about this service."}</div>
        {whatsapp && (
          <p><a className={styles.whatsapp} href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello ${business.name}, I would like to enquire about ${service.name}.`)}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Ask about this service on WhatsApp</a></p>
        )}
        <section className={styles.formSection}>
          <h2>Request this service</h2>
          <p>Leave your contact details so {business.name} can respond to your enquiry.</p>
          {sent ? (
            <p className={styles.success}>Your enquiry has been sent to {business.name}. They can contact you using the details you provided.</p>
          ) : (
            <form onSubmit={(event) => void submit(event)}>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" required />
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone number" inputMode="tel" />
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address (optional)" type="email" />
              <Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={`Tell us what you need for ${service.name}`} rows={4} required />
              <Button type="submit" disabled={sending || !name.trim() || !message.trim()}>{sending ? "Sending…" : "Send service enquiry"}</Button>
              {sendError && <p className={styles.error}>{sendError}</p>}
            </form>
          )}
        </section>
      </main>
      {showFooter && <footer className={styles.footer}><Link href={home}>{business.name}</Link> · <Link href={path("/contact")}>Contact</Link></footer>}
    </div>
  );
}
