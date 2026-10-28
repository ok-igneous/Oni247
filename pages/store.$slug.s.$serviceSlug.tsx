import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { Helmet } from "react-helmet";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { useStorefront } from "../helpers/useStorefront";
import { storeThemeEngine } from "../helpers/storeThemeEngine";
   10	import { postStorefrontEnquiry } from "../endpoints/storefront/enquiry_POST.schema";
   11	import styles from "./store.$slug.s.$serviceSlug.module.css";
   12	
   13	export default function ServiceDetailPage() {
   14	  const { slug, serviceSlug } = useParams<{ slug: string; serviceSlug: string }>();
   15	  const { data, isFetching, error } = useStorefront(slug);
   16	  const [name, setName] = useState("");
   17	  const [phone, setPhone] = useState("");
   18	  const [email, setEmail] = useState("");
   19	  const [message, setMessage] = useState("");
   20	  const [sending, setSending] = useState(false);
   21	  const [sent, setSent] = useState(false);
   22	  const [sendError, setSendError] = useState("");
   23	  if (isFetching && !data) return <main className={styles.page}><p>Loading service…</p></main>;
   24	  const business = data?.business;
   25	  const service = data?.services.find((item) => item.id === serviceSlug);
   26	  if (error || !data || !business || !service) return <main className={styles.page}><h1>Service not found</h1><p>This service may have been removed or is no longer published.</p>{data && <Link to={`/store/${data.business.slug}/services`}>Back to services</Link>}</main>;
   27	  const theme = storeThemeEngine(business.themeId, business.appearanceSettings ?? {});
   28	  const appearance=business.appearanceSettings??{};
   29	  const homePage=typeof appearance.homePage==="string"?appearance.homePage:"home";
   30	  const footerMode=appearance.footerMode==="none"||appearance.footerMode==="selected"?appearance.footerMode:"all";
   31	  const footerPages=Array.isArray(appearance.footerPages)?appearance.footerPages.filter((x):x is string=>typeof x==="string"):[];
   32	  const showFooter=footerMode==="all"||(footerMode==="selected"&&footerPages.includes("service-detail"));
   33	  const price = service.priceType === "contact" ? "Contact for price" : service.priceType === "fixed" ? service.price : `From ${service.price}`;
   34	  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
   35	    event.preventDefault(); setSending(true); setSendError("");
   36	    try { await postStorefrontEnquiry({ slug: business.slug, customerName: name, customerPhone: phone || null, customerEmail: email || null, message: `Service enquiry: ${service.name}\n${message}` }); setSent(true); }
   37	    catch (e) { setSendError(e instanceof Error ? e.message : "Could not send your enquiry. Please try again."); }
   38	    finally { setSending(false); }
   39	  };
   40	  const whatsapp = business.whatsappNumber?.replace(/\D/g, "");
   41	  return <div className={styles.site} style={theme.style as React.CSSProperties}>
   42	    <Helmet><title>{service.name} — {business.name}</title><meta name="description" content={service.description || `${service.name} from ${business.name}`} /><meta property="og:title" content={`${service.name} — ${business.name}`} />{service.imageUrl && <meta property="og:image" content={service.imageUrl} />}</Helmet>
   43	    <header className={styles.header}><Link to={homePage==="home"?`/store/${business.slug}`:`/store/${business.slug}/${homePage}`} className={styles.brand}>{business.logoUrl && <img src={business.logoUrl} alt=""/>}<span><strong>{business.name}</strong>{typeof appearance.headerTagline === "string" && <small>{appearance.headerTagline}</small>}</span></Link><nav className={styles.nav}><Link to={homePage==="home"?`/store/${business.slug}`:`/store/${business.slug}/${homePage}`}>Home</Link><Link to={`/store/${business.slug}/products`}>Products</Link><Link to={`/store/${business.slug}/services`}>Services</Link><Link to={`/store/${business.slug}/contact`}>Contact</Link></nav></header>
   44	    <main className={styles.content}><Link className={styles.back} to={`/store/${business.slug}/services`}><ArrowLeft size={16}/> All services</Link>
   45	      {service.imageUrl && <img className={styles.cover} src={service.imageUrl} alt={service.name}/>}<p className={styles.eyebrow}>{service.category || "Service"}</p><h1>{service.name}</h1><p className={styles.price}>{price}</p>{service.duration && <p className={styles.duration}>Typical duration: {service.duration}</p>}<div className={styles.description}>{service.description || "Contact the business for more information about this service."}</div>
   46	      {whatsapp && <p><a className={styles.whatsapp} href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello ${business.name}, I would like to enquire about ${service.name}.`)}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/> Ask about this service on WhatsApp</a></p>}
   47	      <section className={styles.formSection}><h2>Request this service</h2><p>Leave your contact details so {business.name} can respond to your enquiry.</p>{sent ? <p className={styles.success}>Your enquiry has been sent to {business.name}. They can contact you using the details you provided.</p> : <form onSubmit={(e) => void submit(e)}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required/><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" inputMode="tel"/><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address (optional)" type="email"/><Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Tell us what you need for ${service.name}`} rows={4} required/><Button type="submit" disabled={sending || !name.trim() || !message.trim()}>{sending ? "Sending…" : "Send service enquiry"}</Button>{sendError && <p className={styles.error}>{sendError}</p>}</form>}</section>
   48	    </main>{showFooter&&<footer className={styles.footer}><Link to={homePage==="home"?`/store/${business.slug}`:`/store/${business.slug}/${homePage}`}>{business.name}</Link> · <Link to={`/store/${business.slug}/contact`}>Contact</Link></footer>}
   49	  </div>;
   50	}
