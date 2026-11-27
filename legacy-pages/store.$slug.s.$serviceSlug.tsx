import { storefrontPath } from "../helpers/storefrontPath";
import { useStorefrontRouteParams } from "../helpers/storefrontHost";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Helmet } from "react-helmet";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { useStorefront } from "../helpers/useStorefront";
import { storeThemeEngine } from "../helpers/storeThemeEngine";
import { postStorefrontEnquiry } from "../endpoints/storefront/enquiry_POST.schema";
import styles from "./store.$slug.s.$serviceSlug.module.css";
import { StorefrontHeader } from "../components/StorefrontHeader";

export default function ServiceDetailPage() {
  const { slug, serviceSlug } = useStorefrontRouteParams<{ slug: string; serviceSlug: string }>();
  const { data, isFetching, error } = useStorefront(slug);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  if (isFetching && !data) return <main className={styles.page}><p>Loading service…</p></main>;
  const business = data?.business;
  const service = data?.services.find((item) => item.id === serviceSlug);
  if (error || !data || !business || !service) return <main className={styles.page}><h1>Service not found</h1><p>This service may have been removed or is no longer published.</p>{data && <Link to={storefrontPath(data.business.slug, "/services")}>Back to services</Link>}</main>;
  const theme = storeThemeEngine(business.themeId, business.appearanceSettings ?? {});
  const appearance=business.appearanceSettings??{};
  const homePage=typeof appearance.homePage==="string"?appearance.homePage:"home";
  const footerMode=appearance.footerMode==="none"||appearance.footerMode==="selected"?appearance.footerMode:"all";
  const footerPages=Array.isArray(appearance.footerPages)?appearance.footerPages.filter((x):x is string=>typeof x==="string"):[];
  const showFooter=footerMode==="all"||(footerMode==="selected"&&footerPages.includes("service-detail"));
  const price = service.priceType === "contact" ? "Contact for price" : service.priceType === "fixed" ? service.price : `From ${service.price}`;
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSending(true); setSendError("");
    try { await postStorefrontEnquiry({ slug: business.slug, customerName: name, customerPhone: phone || null, customerEmail: email || null, message: `Service enquiry: ${service.name}\n${message}` }); setSent(true); }
    catch (e) { setSendError(e instanceof Error ? e.message : "Could not send your enquiry. Please try again."); }
    finally { setSending(false); }
  };
  const whatsapp = business.whatsappNumber?.replace(/\D/g, "");
  return <div className={styles.site} style={theme.style as React.CSSProperties}>
    <Helmet><title>{service.name} — {business.name}</title><meta name="description" content={service.description || `${service.name} from ${business.name}`} /><meta property="og:title" content={`${service.name} — ${business.name}`} />{service.imageUrl && <meta property="og:image" content={service.imageUrl} />}</Helmet>
    <StorefrontHeader businessName={business.name} logoUrl={business.logoUrl} tagline={typeof appearance.headerTagline==="string"?appearance.headerTagline:""} headerBrand={typeof appearance.headerBrand==="string"?appearance.headerBrand:"logo_name"} headerAlignment={theme.headerAlignment} menuStyle={theme.menuStyle as "bar"|"minimal"|"pills"} menuPosition={theme.menuPosition as "left"|"center"|"right"} menuVisibility={theme.menuVisibility as "always"|"auto"} navItems={[{label:"Home",href:homePage==="home"?storefrontPath(business.slug):storefrontPath(business.slug,"/"+homePage)},...(data.products.length?[{label:"Products",href:storefrontPath(business.slug,"/products")}]:[]),{label:"Services",href:storefrontPath(business.slug,"/services"),active:true},{label:"About",href:storefrontPath(business.slug,"/about")},...(data.events.length&&appearance.eventsPageInMenu===true?[{label:"Events",href:storefrontPath(business.slug,"/events")}]:[]),{label:"Contact",href:storefrontPath(business.slug,"/contact")}]} />
    <main className={styles.content}><Link className={styles.back} to={storefrontPath(business.slug,"/services")}><ArrowLeft size={16}/> All services</Link>
      {service.imageUrl && <img className={styles.cover} src={service.imageUrl} alt={service.name}/>}<p className={styles.eyebrow}>{service.category || "Service"}</p><h1>{service.name}</h1><p className={styles.price}>{price}</p>{service.duration && <p className={styles.duration}>Typical duration: {service.duration}</p>}<div className={styles.description}>{service.description || "Contact the business for more information about this service."}</div>
      {whatsapp && <p><a className={styles.whatsapp} href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello ${business.name}, I would like to enquire about ${service.name}.`)}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/> Ask about this service on WhatsApp</a></p>}
      <section className={styles.formSection}><h2>Request this service</h2><p>Leave your contact details so {business.name} can respond to your enquiry.</p>{sent ? <p className={styles.success}>Your enquiry has been sent to {business.name}. They can contact you using the details you provided.</p> : <form onSubmit={(e) => void submit(e)}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required/><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" inputMode="tel"/><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address (optional)" type="email"/><Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Tell us what you need for ${service.name}`} rows={4} required/><Button type="submit" disabled={sending || !name.trim() || !message.trim()}>{sending ? "Sending…" : "Send service enquiry"}</Button>{sendError && <p className={styles.error}>{sendError}</p>}</form>}</section>
    </main>{showFooter&&<footer className={styles.footer}><Link to={homePage==="home"?storefrontPath(business.slug):storefrontPath(business.slug,"/"+homePage)}>{business.name}</Link> · <Link to={storefrontPath(business.slug,"/contact")}>Contact</Link></footer>}
  </div>;
}