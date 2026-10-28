import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Check, ImageOff, MessageCircle, Phone, Store } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { formatMoney } from "../helpers/formatMoney";
import { buildWhatsAppReplyUrl } from "../helpers/buildWhatsAppReplyUrl";
import { useTrackedOrder } from "../helpers/useTrackedOrder";
   10	import { storeThemeEngine } from "../helpers/storeThemeEngine";
   11	import type { ShippingStatus } from "../helpers/schema";
   12	import styles from "./track.$code.module.css";
   13	
   14	const shippingSteps: { id: ShippingStatus; label: string; blurb: string }[] = [
   15	  { id: "preparing", label: "Preparing", blurb: "The shop is getting your items ready." },
   16	  { id: "shipped", label: "Shipped", blurb: "Your order has left the shop." },
   17	  { id: "out_for_delivery", label: "Out for delivery", blurb: "On its way to you now." },
   18	  { id: "delivered", label: "Delivered", blurb: "This order has been delivered." },
   19	];
   20	
   21	const TrackOrderPage = () => {
   22	  const { code, slug } = useParams<{ code: string; slug?: string }>();
   23	  const { data, isFetching, error } = useTrackedOrder(code);
   24	
   25	  if (isFetching && !data) {
   26	    return (
   27	      <div className={styles.page}>
   28	        <Skeleton className={styles.skeletonTitle} />
   29	        <Skeleton className={styles.skeletonBlock} />
   30	      </div>
   31	    );
   32	  }
   33	
   34	  if (error || !data) {
   35	    return (
   36	      <div className={styles.page}>
   37	        <h1 className={styles.title}>Order not found</h1>
   38	        <p className={styles.body}>
   39	          {error instanceof Error
   40	            ? error.message
   41	            : "No order matches that code."}
   42	        </p>
   43	        <Button asChild variant="outline">
   44	          <Link to="/track">Try another code</Link>
   45	        </Button>
   46	      </div>
   47	    );
   48	  }
   49	
   50	  const { order, business, recommended } = data;
   51	  const isCollection = order.shippingStatus === "not_required";
   52	  const currentIndex = shippingSteps.findIndex(
   53	    (step) => step.id === order.shippingStatus,
   54	  );
   55	  const whatsapp = business.whatsappNumber ?? business.phone ?? "";
   56	  const theme = storeThemeEngine(business.themeId ?? "clean", business.appearanceSettings ?? {});
   57	  const appearance=business.appearanceSettings??{};
   58	  const homePage=typeof appearance.homePage==="string"?appearance.homePage:"home";
   59	  const footerMode=appearance.footerMode==="none"||appearance.footerMode==="selected"?appearance.footerMode:"all";
   60	  const footerPages=Array.isArray(appearance.footerPages)?appearance.footerPages.filter((x):x is string=>typeof x==="string"):[];
   61	  const showFooter=footerMode==="all"||(footerMode==="selected"&&footerPages.includes("tracking"));
   62	  if (slug && slug !== business.slug) return <div className={styles.page}><h1 className={styles.title}>Order link does not match this business</h1><p className={styles.body}>Open the tracking link provided by the business that received your order.</p><Button asChild variant="outline"><Link to={`/store/${business.slug}`}>Visit {business.name}</Link></Button></div>;
   63	
   64	  return (
   65	    <div className={styles.site} style={theme.style as React.CSSProperties}>
   66	      <Helmet>
   67	        <title>{`Order ${order.trackingCode} — ${business.name}`}</title>
   68	        <meta name="robots" content="noindex" />
   69	        <meta property="og:title" content={`Order ${order.trackingCode} — ${business.name}`} />
   70	        <meta property="og:description" content={`Track your order from ${business.name}.`} />
   71	        <meta property="og:image" content={typeof business.appearanceSettings?.shareImageUrl === "string" ? business.appearanceSettings.shareImageUrl : business.heroImageUrl || business.logoUrl || ""} />
   72	      </Helmet>
   73	
   74	      <header className={styles.siteHeader}>
   75	        <Link to={homePage==="home"?`/store/${business.slug}`:`/store/${business.slug}/${homePage}`} className={styles.brand}>{business.appearanceSettings?.headerBrand !== "name" && business.appearanceSettings?.headerBrand !== "name_tagline" && business.logoUrl ? <img className={styles.brandLogo} src={business.logoUrl} alt=""/> : business.appearanceSettings?.headerBrand === "logo" ? <span className={styles.brandMark}>{business.name.charAt(0).toUpperCase()}</span> : null}<span>{business.appearanceSettings?.headerBrand !== "logo" && <strong>{business.name}</strong>}{(business.appearanceSettings?.headerBrand === "logo_name_tagline" || business.appearanceSettings?.headerBrand === "name_tagline" || typeof business.appearanceSettings?.headerTagline === "string") && typeof business.appearanceSettings?.headerTagline === "string" && business.appearanceSettings.headerTagline ? <small>{business.appearanceSettings.headerTagline}</small> : <small>Order tracking</small>}</span></Link>
   76	        <nav>{(business.appearanceSettings?.siteMode === "multi_page" ? [{ label: "Home", to: homePage==="home"?`/store/${business.slug}`:`/store/${business.slug}/${homePage}` }, { label: "About", to: `/store/${business.slug}/about` }, { label: "Products", to: `/store/${business.slug}/products` }, { label: "Services", to: `/store/${business.slug}/services` }, { label: "Gallery", to: `/store/${business.slug}/gallery` }, { label: "Blog", to: `/store/${business.slug}/blog` }, { label: "Contact", to: `/store/${business.slug}/contact` }] : [{ label: "Home", to: `/store/${business.slug}` }, { label: "Products", to: `/store/${business.slug}#catalogue` }, { label: "Services", to: `/store/${business.slug}#services` }, { label: "Gallery", to: `/store/${business.slug}#gallery` }, { label: "About", to: `/store/${business.slug}#about` }, { label: "Contact", to: `/store/${business.slug}#contact` }]).map((item) => <Link key={item.label} to={item.to}>{item.label}</Link>)}<Link to="/track">Track another order</Link></nav>
   77	      </header>
   78	      <main className={styles.content}>
   79	      <header className={styles.head}>
   80	        <Link to={`/store/${business.slug}`} className={styles.shopLink}>
   81	          <Store size={15} />
   82	          {business.name}
   83	        </Link>
   84	        <h1 className={styles.title}>Order {order.trackingCode}</h1>
   85	        <p className={styles.body}>
   86	          Placed {new Date(order.createdAt).toLocaleDateString()} for{" "}
   87	          {order.customerName}.
   88	        </p>
   89	        <div className={styles.badges}>
   90	          <Badge
   91	            variant={
   92	              order.status === "completed"
   93	                ? "success"
   94	                : order.status === "cancelled"
   95	                  ? "secondary"
   96	                  : "warning"
   97	            }
   98	          >
   99	            {order.status}
  100	          </Badge>
  101	          {isCollection && <Badge variant="secondary">For collection</Badge>}
  102	        </div>
  103	      </header>
  104	
  105	      {!isCollection && (
  106	        <section className={styles.progress}>
  107	          {shippingSteps.map((step, index) => {
  108	            const done = index <= currentIndex;
  109	            return (
  110	              <div
  111	                key={step.id}
  112	                className={`${styles.step} ${done ? styles.stepDone : ""}`}
  113	              >
  114	                <span className={styles.stepMarker}>
  115	                  {done ? <Check size={13} /> : index + 1}
  116	                </span>
  117	                <div className={styles.stepText}>
  118	                  <span className={styles.stepLabel}>{step.label}</span>
  119	                  {index === currentIndex && (
  120	                    <span className={styles.stepBlurb}>{step.blurb}</span>
  121	                  )}
  122	                </div>
  123	              </div>
  124	            );
  125	          })}
  126	        </section>
  127	      )}
  128	
  129	      {order.ownerNote && (
  130	        <p className={styles.note}>
  131	          <strong>From the shop:</strong> {order.ownerNote}
  132	        </p>
  133	      )}
  134	
  135	      <section className={styles.summary}>
  136	        <h2 className={styles.sectionHeading}>Your items</h2>
  137	        <ul className={styles.lines}>
  138	          {order.items.map((line, index) => (
  139	            <li key={`${line.name}-${index}`} className={styles.line}>
  140	              <span>
  141	                {line.quantity} × {line.name}
  142	              </span>
  143	              <span className={styles.lineTotal}>
  144	                {formatMoney(line.lineTotal, order.currency)}
  145	              </span>
  146	            </li>
  147	          ))}
  148	        </ul>
  149	        <div className={styles.totalRow}>
  150	          <span>Total</span>
  151	          <span className={styles.total}>
  152	            {formatMoney(order.totalAmount, order.currency)}
  153	          </span>
  154	        </div>
  155	        {order.deliveryAddress && (
  156	          <p className={styles.address}>
  157	            Delivering to {order.deliveryAddress}
  158	          </p>
  159	        )}
  160	      </section>
  161	
  162	      {whatsapp && (
  163	        <section className={styles.contact}>
  164	          <h2 className={styles.sectionHeading}>Need to change something?</h2>
  165	          <div className={styles.contactRow}>
  166	            <Button asChild>
  167	              <a
  168	                href={buildWhatsAppReplyUrl({
  169	                  phone: whatsapp,
  170	                  message: `Hello ${business.name}, I am asking about order ${order.trackingCode}.`,
  171	                })}
  172	                target="_blank"
  173	                rel="noopener noreferrer"
  174	              >
  175	                <MessageCircle size={16} />
  176	                Message the shop
  177	              </a>
  178	            </Button>
  179	            {business.phone && (
  180	              <Button asChild variant="outline">
  181	                <a href={`tel:${business.phone.replace(/\s/g, "")}`}>
  182	                  <Phone size={16} />
  183	                  Call
  184	                </a>
  185	              </Button>
  186	            )}
  187	          </div>
  188	        </section>
  189	      )}
  190	
  191	      {recommended.length > 0 && (
  192	        <section className={styles.related}>
  193	          <h2 className={styles.sectionHeading}>You might also like</h2>
  194	          <div className={styles.relatedGrid}>
  195	            {recommended.map((item) => (
  196	              <Link
  197	                key={item.id}
  198	                to={`/store/${business.slug}/p/${item.slug}`}
  199	                className={styles.relatedCard}
  200	              >
  201	                <div className={styles.relatedMedia}>
  202	                  {item.imageUrl ? (
  203	                    <img
  204	                      src={item.imageUrl}
  205	                      alt=""
  206	                      className={styles.relatedImage}
  207	                      loading="lazy"
  208	                    />
  209	                  ) : (
  210	                    <ImageOff size={18} className={styles.relatedIcon} />
  211	                  )}
  212	                </div>
  213	                <span className={styles.relatedName}>{item.name}</span>
  214	                <span className={styles.relatedPrice}>
  215	                  {formatMoney(item.price, item.currency)}
  216	                </span>
  217	              </Link>
  218	            ))}
  219	          </div>
  220	          <Button asChild variant="outline" className={styles.shopAll}>
  221	            <Link to={`/store/${business.slug}`}>Back to the shop</Link>
  222	          </Button>
  223	        </section>
  224	      )}
  225	      </main>
  226	      {showFooter&&<footer className={styles.footer}>Order tracking · {business.name}</footer>}
  227	    </div>
  228	  );
  229	};
  230	
  231	export default TrackOrderPage;