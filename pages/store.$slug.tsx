import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Copy,
   10	  ExternalLink,
   11	  MapPin,
   12	  MessageCircle,
   13	  Minus,
   14	  Phone,
   15	  Plus,
   16	  Search,
   17	  Send,
   18	  ShoppingBag,
   19	  Star,
   20	  X,
   21	} from "lucide-react";
   22	import { Badge } from "../components/Badge";
   23	import { Button } from "../components/Button";
   24	import { Input } from "../components/Input";
   25	import { Skeleton } from "../components/Skeleton";
   26	import { Spinner } from "../components/Spinner";
   27	import { Textarea } from "../components/Textarea";
   28	import { StoreProductCard } from "../components/StoreProductCard";
   29	import { formatMoney } from "../helpers/formatMoney";
   30	import { buildWhatsAppOrderUrl } from "../helpers/buildWhatsAppOrderUrl";
   31	import { useStoreCart } from "../helpers/useStoreCart";
   32	import { useMyOrders } from "../helpers/useMyOrders";
   33	import { useStorefront } from "../helpers/useStorefront";
   34	import { getPublicGalleries } from "../endpoints/galleries/publicList_GET.schema";
   35	import { postStorefrontOrder } from "../endpoints/storefront/order_POST.schema";
   36	import { postStorefrontEnquiry } from "../endpoints/storefront/enquiry_POST.schema";
   37	import { trackStoreEvent } from "../helpers/trackStoreEvent";
   38	import { storeThemeEngine } from "../helpers/storeThemeEngine";
   39	import { normalizeVideoEmbedUrl } from "../helpers/normalizeVideoEmbedUrl";
   40	import type { StorefrontProduct } from "../endpoints/storefront_GET.schema";
   41	import styles from "./store.$slug.module.css";
   42	
   43	const safeContentLink = (value: string): string | null => {
   44	  const trimmed = value.trim();
   45	  if ((trimmed.startsWith("/") && !trimmed.startsWith("//")) || trimmed.startsWith("#")) return trimmed;
   46	  try {
   47	    const url = new URL(trimmed);
   48	    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
   49	  } catch {
   50	    return null;
   51	  }
   52	};
   53	
   54	const StorePage = () => {
   55	  const { slug } = useParams<{ slug: string }>();
   56	  const { data, isFetching, error } = useStorefront(slug);
   57	
   58	  const [search, setSearch] = useState("");
   59	  const [activeCategory, setActiveCategory] = useState<string | null>(null);
   60	  const [cartOpen, setCartOpen] = useState(false);
   61	  const [customerName, setCustomerName] = useState("");
   62	  const [customerPhone, setCustomerPhone] = useState("");
   63	  const [deliveryAddress, setDeliveryAddress] = useState("");
   64	  const [sending, setSending] = useState(false);
   65	  const [placed, setPlaced] = useState<string | null>(null);
   66	
   67	  const [enquiry, setEnquiry] = useState({
   68	    name: "",
   69	    phone: "",
   70	    email: "",
   71	    message: "",
   72	  });
   73	  const [enquirySending, setEnquirySending] = useState(false);
   74	  const [enquirySent, setEnquirySent] = useState(false);
   75	  const [navVisible, setNavVisible] = useState(true);
   76	  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
   77	  const [galleries, setGalleries] = useState<Awaited<ReturnType<typeof getPublicGalleries>>["galleries"]>([]);
   78	
   79	  useEffect(() => {
   80	    if (!slug || !data?.business.canUseMultiPage) { setGalleries([]); return; }
   81	    void getPublicGalleries(slug).then(r => setGalleries(r.galleries)).catch(() => setGalleries([]));
   82	  }, [slug, data?.business.canUseMultiPage]);
   83	  useEffect(() => {
   84	    if (data?.business) trackStoreEvent("store_view", { businessSlug: data.business.slug });
   85	  }, [data?.business]);
   86	
   87	  const cart = useStoreCart(slug ?? "unknown");
   88	  const myOrders = useMyOrders(slug);
   89	
   90	  useEffect(() => {
   91	    let lastY = window.scrollY;
   92	    const onScroll = () => {
   93	      const y = window.scrollY;
   94	      if (y < 40 || y < lastY - 4) setNavVisible(true);
   95	      else if (y > lastY + 4) setNavVisible(false);
   96	      lastY = y;
   97	    };
   98	    window.addEventListener("scroll", onScroll, { passive: true });
   99	    return () => window.removeEventListener("scroll", onScroll);
  100	  }, []);
  101	
  102	  const products = data?.products ?? [];
  103	  const services = data?.services ?? [];
  104	  const categories = data?.categories ?? [];
  105	  const testimonials = data?.testimonials ?? [];
  106	  const portfolio = data?.portfolio ?? [];
  107	  const blogPosts = data?.blogPosts ?? [];
  108	
  109	  const featured = useMemo(
  110	    () => products.filter((product) => product.featured),
  111	    [products],
  112	  );
  113	
  114	  const visibleProducts = useMemo(() => {
  115	    const term = search.trim().toLowerCase();
  116	    return products.filter((product) => {
  117	      const matchesCategory =
  118	        !activeCategory || product.categoryId === activeCategory;
  119	      const matchesTerm =
  120	        term.length === 0 ||
  121	        product.name.toLowerCase().includes(term) ||
  122	        (product.description ?? "").toLowerCase().includes(term);
  123	      return matchesCategory && matchesTerm;
  124	    });
  125	  }, [products, search, activeCategory]);
  126	
  127	  if (isFetching && !data) {
  128	    return (
  129	      <div className={styles.page}>
  130	        <header className={styles.header}>
  131	          <div className={styles.headerInner}>
  132	            <div className={styles.identity}>
  133	              <Skeleton className={styles.skeletonLogo} />
  134	              <div className={styles.identityText}>
  135	                <Skeleton className={styles.skeletonTitle} />
  136	                <Skeleton className={styles.skeletonLine} />
  137	              </div>
  138	            </div>
  139	          </div>
  140	        </header>
  141	        <main className={styles.main}>
  142	          <section className={styles.section}>
  143	            <div className={styles.grid}>
  144	              {[0, 1, 2, 3].map((index) => (
  145	                <Skeleton key={index} className={styles.skeletonCard} />
  146	              ))}
  147	            </div>
  148	          </section>
  149	        </main>
  150	      </div>
  151	    );
  152	  }
  153	
  154	  if (error || !data) {
  155	    return (
  156	      <div className={styles.page}>
  157	        <main className={styles.main}>
  158	          <div className={styles.notFound}>
  159	            <h1 className={styles.notFoundTitle}>Page not found</h1>
  160	            <p className={styles.emptyBody}>
  161	              No published business page exists at this address. Check the link,
  162	              or ask the business to share it again.
  163	            </p>
  164	          </div>
  165	        </main>
  166	      </div>
  167	    );
  168	  }
  169	
  170	  const business = data.business;
  171	  const theme = business.themeId;
  172	  const isService = theme === "service";
  173	  const appearance = business.appearanceSettings ?? {};
  174	  const content = business.contentSettings ?? {};
  175	  const rawHomeSlides = Array.isArray(content.homepageSlides) ? content.homepageSlides : [];
  176	  const homepageSlides = business.canUseMultiPage ? rawHomeSlides.slice(0, 5).flatMap((raw, index) => {
  177	    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  178	    const slide = raw as Record<string, unknown>;
  179	    const imageUrl = typeof slide.imageUrl === "string" ? safeContentLink(slide.imageUrl) : null;
  180	    const ctaUrl = typeof slide.ctaUrl === "string" ? safeContentLink(slide.ctaUrl) : null;
  181	    const headline = typeof slide.headline === "string" ? slide.headline.trim() : "";
  182	    const text = typeof slide.text === "string" ? slide.text.trim() : "";
  183	    const ctaLabel = typeof slide.ctaLabel === "string" ? slide.ctaLabel.trim() : "";
  184	    if (!imageUrl && !headline && !text) return [];
  185	    return [{ id: typeof slide.id === "string" ? slide.id : `slide-${index + 1}`, imageUrl, headline, text, ctaLabel, ctaUrl }];
  186	  }) : [];
  187	  const homepageVideoUrl = business.canUseMultiPage && typeof content.homepageVideoUrl === "string"
  188	    ? normalizeVideoEmbedUrl(content.homepageVideoUrl)
  189	    : null;
  190	  const menuVisibility = appearance.menuVisibility === "always" ? "always" : "auto";
  191	  const menuStyle = appearance.menuStyle === "pills" || appearance.menuStyle === "minimal" ? appearance.menuStyle : "bar";
  192	  const layout = appearance.layout === "wide" || appearance.layout === "compact" ? appearance.layout : "standard";
  193	  const themeEngine = storeThemeEngine(theme, appearance);
  194	  const showHeaderActions = themeEngine.headerActions;
  195	  const headerBrand = themeEngine.headerBrand;
  196	  const headerTagline = themeEngine.headerTagline;
  197	  const menuPosition = themeEngine.menuPosition;
  198	  const heroLayout = themeEngine.heroLayout;
  199	  const siteMode = themeEngine.siteMode === "multi_page" && business.canUseMultiPage ? "multi_page" : "one_page";
  200	  const sections = {
  201	    hero: true, slider: true, video: true, gallery: true, services: true, featured: true, catalogue: true, about: true,
  202	    work: true, testimonials: true, blog: true, contact: true,
  203	    ...(typeof appearance.sections === "object" && appearance.sections !== null ? appearance.sections : {}),
  204	  };
  205	  const sectionOrder = Array.isArray(appearance.sectionOrder) ? appearance.sectionOrder.filter((key): key is string => typeof key === "string") : [];
  206	  const orderOf = (key: string) => { const index = sectionOrder.indexOf(key); return 10 + (index < 0 ? ["hero","slider","video","gallery","services","featured","catalogue","about","work","testimonials","blog","contact"].indexOf(key) : index); };
  207	  const selectedHomePage = typeof appearance.homePage === "string" ? appearance.homePage : "home";
  208	  const footerMode = appearance.footerMode === "none" || appearance.footerMode === "selected" ? appearance.footerMode : "all";
  209	  const footerPages = Array.isArray(appearance.footerPages) ? appearance.footerPages.filter((key): key is string => typeof key === "string") : [];
  210	  const showFooter = footerMode === "all" || (footerMode === "selected" && footerPages.includes(selectedHomePage === "home" ? "home" : selectedHomePage));
  211	  if (siteMode === "multi_page" && selectedHomePage !== "home" && ["products","services","about","gallery","blog","contact"].includes(selectedHomePage)) return <Navigate to={`/store/${business.slug}/${selectedHomePage}`} replace />;
  212	  const pageStyle = themeEngine.style as React.CSSProperties;
  213	  const shareDescription =
  214	    business.description ?? `Browse products and services from ${business.name}.`;
  215	  const shareUrl = typeof window !== "undefined" ? window.location.href : `/store/${business.slug}`;
  216	
  217	  const handleAdd = (product: StorefrontProduct) => {
  218	    cart.add({
  219	      productId: product.id,
  220	      name: product.name,
  221	      price: product.price,
  222	      currency: product.currency,
  223	      imageUrl: product.imageUrl,
  224	    });
  225	    setCartOpen(true);
  226	  };
  227	
  228	  const whatsappNumber = business.whatsappNumber ?? business.phone ?? "";
  229	
  230	  const orderUrl = buildWhatsAppOrderUrl({
  231	    businessName: business.name,
  232	    whatsappNumber,
  233	    currency: business.currency,
  234	    customerName,
  235	    customerPhone,
  236	    items: cart.items.map((line) => ({
  237	      name: line.name,
  238	      quantity: line.quantity,
  239	      unitPrice: line.price,
  240	    })),
  241	  });
  242	
  243	  const enquiryUrl = buildWhatsAppOrderUrl({
  244	    businessName: business.name,
  245	    whatsappNumber,
  246	    currency: business.currency,
  247	    items: [],
  248	  });
  249	
  250	  const canSend =
  251	    customerName.trim().length > 0 && customerPhone.trim().length > 3;
  252	
  253	  const handleSendOrder = async () => {
  254	    if (!slug || !canSend) return;
  255	    trackStoreEvent("order_submit", { businessSlug: slug });
  256	    // Opened synchronously so the browser does not treat it as a popup.
  257	    const waWindow = window.open("", "_blank");
  258	    setSending(true);
  259	    let trackingCode: string | null = null;
  260	    const orderTotal = cart.total;
  261	    try {
  262	      const result = await postStorefrontOrder({
  263	        slug,
  264	        customerName,
  265	        customerPhone,
  266	        deliveryAddress,
  267	        items: cart.items.map((line) => ({
  268	          productId: line.productId,
  269	          quantity: line.quantity,
  270	        })),
  271	      });
  272	      trackingCode = result.trackingCode;
  273	    } catch (err) {
  274	      // Recording is for the shop's records; never block the customer's order.
  275	      console.error("Order not recorded:", err);
  276	    } finally {
  277	      setSending(false);
  278	      const trackingUrl = trackingCode
  279	        ? `${window.location.origin}/store/${business.slug}/track/${trackingCode}`
  280	        : null;
  281	      // Both sides get a tappable link: the customer keeps it in their own
  282	      // chat history, and the shop can open the order straight from WhatsApp.
  283	      const finalUrl =
  284	        trackingCode && trackingUrl
  285	          ? buildWhatsAppOrderUrl({
  286	              businessName: business.name,
  287	              whatsappNumber,
  288	              currency: business.currency,
  289	              customerName,
  290	              customerPhone,
  291	              note: `Order reference: ${trackingCode}\nTrack it here: ${trackingUrl}`,
  292	              items: cart.items.map((line) => ({
  293	                name: line.name,
  294	                quantity: line.quantity,
  295	                unitPrice: line.price,
  296	              })),
  297	            })
  298	          : orderUrl;
  299	      if (waWindow) {
  300	        waWindow.location.href = finalUrl;
  301	      } else {
  302	        window.location.href = finalUrl;
  303	      }
  304	      if (trackingCode && slug) {
  305	        myOrders.remember({
  306	          code: trackingCode,
  307	          slug,
  308	          businessName: business.name,
  309	          total: orderTotal,
  310	          currency: business.currency,
  311	          placedAt: new Date().toISOString(),
  312	        });
  313	      }
  314	      setPlaced(trackingCode);
  315	      cart.clear();
  316	      setCartOpen(false);
  317	    }
  318	  };
  319	
  320	  const handleSendEnquiry = async () => {
  321	    if (!slug) return;
  322	    setEnquirySending(true);
  323	    trackStoreEvent("enquiry_submit", { businessSlug: slug });
  324	    try {
  325	      await postStorefrontEnquiry({
  326	        slug,
  327	        customerName: enquiry.name,
  328	        customerPhone: enquiry.phone,
  329	        customerEmail: enquiry.email,
  330	        message: enquiry.message,
  331	      });
  332	      setEnquirySent(true);
  333	      setEnquiry({ name: "", phone: "", email: "", message: "" });
  334	    } catch (err) {
  335	      toast.error(
  336	        err instanceof Error ? err.message : "Could not send your message.",
  337	      );
  338	    } finally {
  339	      setEnquirySending(false);
  340	    }
  341	  };
  342	
  343	  return (
  344	    <div className={`${styles.page} ${styles[`theme_${theme}`]} ${styles[`layout_${layout}`]}`} style={pageStyle}>
  345	      <Helmet>
  346	        <title>{`${business.name} — Products & Services`}</title>
  347	        <meta name="description" content={shareDescription} />
  348	        <meta property="og:title" content={business.name} />
  349	        <meta property="og:description" content={shareDescription} />
  350	        <meta property="og:type" content="website" />
  351	        {(typeof appearance.shareImageUrl === "string" && appearance.shareImageUrl) || business.heroImageUrl || business.logoUrl ? (
  352	          <meta property="og:image" content={(typeof appearance.shareImageUrl === "string" && appearance.shareImageUrl) || business.heroImageUrl || business.logoUrl || ""} />
  353	        ) : null}
  354	      </Helmet>
  355	
  356	      <header className={styles.header} id="home">
  357	        <div className={styles.headerInner} style={{ justifyContent: themeEngine.headerAlignment === "center" ? "center" : "space-between" }}>
  358	          <div className={styles.identity} style={{ textAlign: themeEngine.headerAlignment === "center" ? "center" : "left" }}>
  359	            {(headerBrand === "logo" || headerBrand === "logo_name" || headerBrand === "logo_name_tagline") && (
  360	              <div className={styles.logo}>
  361	                {business.logoUrl ? <img src={business.logoUrl} alt="" className={styles.logoImage} /> : business.name.charAt(0)}
  362	              </div>
  363	            )}
  364	            {headerBrand !== "logo" && (
  365	              <div className={styles.identityText}>
  366	                <h1 className={styles.businessName}>{business.name}</h1>
  367	                {(headerBrand === "logo_name_tagline" || headerBrand === "name_tagline") && headerTagline && (
  368	                  <p className={styles.tagline}>{headerTagline}</p>
  369	                )}
  370	              </div>
  371	            )}
  372	            {headerBrand === "logo" && headerTagline && <span className={styles.tagline}>{headerTagline}</span>}
  373	          </div>
  374	
  375	          <nav className={`${styles.nav} ${styles[`menu_${menuStyle}`]} ${styles[`menuPos_${menuPosition}`]} ${menuVisibility === "auto" && !navVisible ? styles.navHidden : ""}`} aria-label="Store sections">
  376	            {siteMode === "multi_page" ? <>
  377	              <Link className={styles.navLink} to={selectedHomePage === "home" ? ("/store/" + business.slug) : ("/store/" + business.slug + "/" + selectedHomePage)}>Home</Link>
  378	              <Link className={styles.navLink} to={"/store/" + business.slug + "/products"}>Products</Link>
  379	              <Link className={styles.navLink} to={"/store/" + business.slug + "/services"}>Services</Link>
  380	              <Link className={styles.navLink} to={"/store/" + business.slug + "/about"}>About</Link>
  381	              {blogPosts.length > 0 && <Link className={styles.navLink} to={"/store/" + business.slug + "/blog"}>Blog</Link>}
  382	              <Link className={styles.navLink} to={"/store/" + business.slug + "/gallery"}>Gallery</Link>
  383	              <Link className={styles.navLink} to={"/store/" + business.slug + "/contact"}>Contact</Link>
  384	            </> : <>
  385	              <a className={styles.navLink} href="#home">Home</a>
  386	              <a className={styles.navLink} href={isService && services.length > 0 ? "#services" : "#catalogue"}>{isService ? "Services" : "Products"}</a>
  387	              <a className={styles.navLink} href="#about">About</a>
  388	              {sections.blog && blogPosts.length > 0 && <a className={styles.navLink} href="#blog">Blog</a>}
  389	              <a className={styles.navLink} href="#contact">Contact</a>
  390	            </>}
  391	            <Link className={styles.navLink} to="/track">Track order</Link>
  392	          </nav>
  393	
  394	          {showHeaderActions && <div className={styles.headerActions}>
  395	            {whatsappNumber && (
  396	              <Button asChild>
  397	                <a href={enquiryUrl} target="_blank" rel="noopener noreferrer">
  398	                  <MessageCircle size={16} />
  399	                  WhatsApp
  400	                </a>
  401	              </Button>
  402	            )}
  403	            {business.phone && (
  404	              <Button asChild variant="outline">
  405	                <a href={`tel:${business.phone.replace(/\s/g, "")}`}>
  406	                  <Phone size={16} />
  407	                  Call
  408	                </a>
  409	              </Button>
  410	            )}
  411	          </div>}
  412	        </div>
  413	      </header>
  414	
  415	      <main className={styles.main} style={{ display: "flex", flexDirection: "column" }}>
  416	        {sections.hero && (business.heroHeadline || business.heroSubtext || business.heroImageUrl) && (
  417	          <section style={{ order: orderOf("hero") }} className={`${styles.hero} ${styles[`hero_${heroLayout}`]}`}>
  418	            {business.heroImageUrl && heroLayout !== "text" && (
  419	              <img src={business.heroImageUrl} alt="" className={styles.heroImage} />
  420	            )}
  421	            <div className={styles.heroText}>
  422	              {business.heroHeadline && (
  423	                <h2 className={styles.heroHeadline}>{business.heroHeadline}</h2>
  424	              )}
  425	              {business.heroSubtext && (
  426	                <p className={styles.heroSubtext}>{business.heroSubtext}</p>
  427	              )}
  428	              {whatsappNumber && (
  429	                <Button asChild size="lg">
  430	                  <a
  431	                    href={enquiryUrl}
  432	                    target="_blank"
  433	                    rel="noopener noreferrer"
  434	                  >
  435	                    <MessageCircle size={17} />
  436	                    {business.heroCtaLabel || "Message us on WhatsApp"}
  437	                  </a>
  438	                </Button>
  439	              )}
  440	            </div>
  441	          </section>
  442	        )}
  443	
  444	        {sections.slider !== false && homepageSlides.length > 0 && (
  445	          <section className={styles.homepageSlider} style={{ order: orderOf("slider") }} aria-label="Featured slides">
  446	            <div className={styles.sliderViewport}>
  447	              <div className={styles.sliderTrack} style={{ transform: `translateX(-${Math.min(activeSlideIndex, homepageSlides.length - 1) * 100}%)` }}>
  448	                {homepageSlides.map((slide) => (
  449	                  <article className={`${styles.homeSlide} ${slide.imageUrl ? "" : styles.homeSlideNoImage}`} key={slide.id}>
  450	                    {slide.imageUrl && <img className={styles.homeSlideImage} src={slide.imageUrl} alt={slide.headline} loading="lazy" decoding="async" />}
  451	                    <div className={styles.homeSlideText}>
  452	                      {slide.headline && <h2>{slide.headline}</h2>}
  453	                      {slide.text && <p>{slide.text}</p>}
  454	                      {slide.ctaLabel && slide.ctaUrl && <Button asChild size="sm"><a href={slide.ctaUrl} target={slide.ctaUrl.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{slide.ctaLabel}</a></Button>}
  455	                    </div>
  456	                  </article>
  457	                ))}
  458	              </div>
  459	            </div>
  460	            {homepageSlides.length > 1 && <div className={styles.sliderControls}>
  461	              <Button variant="outline" size="sm" aria-label="Previous slide" onClick={() => setActiveSlideIndex((current) => (current - 1 + homepageSlides.length) % homepageSlides.length)}><ChevronLeft size={16} /> Previous</Button>
  462	              <span>Slide {Math.min(activeSlideIndex, homepageSlides.length - 1) + 1} of {homepageSlides.length}</span>
  463	              <Button variant="outline" size="sm" aria-label="Next slide" onClick={() => setActiveSlideIndex((current) => (current + 1) % homepageSlides.length)}>Next <ChevronRight size={16} /></Button>
  464	            </div>}
  465	          </section>
  466	        )}
  467	
  468	        {sections.video !== false && homepageVideoUrl && <section className={styles.videoSection} style={{ order: orderOf("video") }}>
  469	          <h2 className={styles.sectionHeading}>Watch our video</h2>
  470	          <div className={styles.videoFrame}>
  471	            <iframe src={homepageVideoUrl} title={`${business.name} video`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
  472	          </div>
  473	        </section>}
  474	
  475	        {sections.gallery && galleries.length > 0 && (
  476	          <section className={styles.section} id="gallery" style={{ order: orderOf("gallery") }}>
  477	            <div className={styles.catalogueHead}><h2 className={styles.sectionHeading}>Gallery</h2><Link className={styles.myOrdersLink} to={"/store/" + business.slug + "/g/" + galleries[0].slug}>View all</Link></div>
  478	            <div className={styles.featuredRow}>{galleries.slice(0,4).map(g => <Link key={g.id} to={"/store/" + business.slug + "/g/" + g.slug} className={styles.featuredCard}><div className={styles.media}>{g.coverImageUrl ? <img src={g.coverImageUrl} alt="" className={styles.image}/> : null}</div><strong>{g.name}</strong><span>{g.imageCount} photos</span></Link>)}</div>
  479	          </section>
  480	        )}
  481	
  482	        {sections.services !== false && services.length > 0 && (
  483	          <section className={styles.section} id="services" style={{ order: orderOf("services") }}>
  484	            <h2 className={styles.sectionHeading}>Services</h2>
  485	            <div className={styles.serviceGrid}>
  486	              {services.map((service) => (
  487	                <article key={service.id} className={styles.serviceCard}>
  488	                  {service.imageUrl && <img src={service.imageUrl} alt="" className={styles.serviceImage} loading="lazy" decoding="async" />}
  489	                  <div className={styles.serviceBody}>
  490	                    <div className={styles.serviceTop}><h3>{service.name}</h3>{service.featured && <Badge>Featured</Badge>}</div>
  491	                    {service.description && <p className={styles.servicePreview}>{service.description.length > 150 ? service.description.slice(0, 150).trim() + "…" : service.description}</p>}
  492	                    <div className={styles.serviceMeta}>{service.priceType === "contact" ? "Contact for price" : service.priceType === "fixed" ? service.price : "From " + service.price}{service.duration ? " · " + service.duration : ""}</div>
  493	                    <Button asChild size="sm"><Link to={`/store/${business.slug}/s/${service.id}`}>View service and enquire</Link></Button>
  494	                  </div>
  495	                </article>
  496	              ))}
  497	            </div>
  498	          </section>
  499	        )}
  500	
  501	        {myOrders.forThisShop.length > 0 && (
  502	          <div className={styles.myOrdersBar} style={{ order: 90 }}>
  503	            <span>
  504	              You have {myOrders.forThisShop.length}{" "}
  505	              {myOrders.forThisShop.length === 1 ? "order" : "orders"} with this
  506	              shop.
  507	            </span>
  508	            <Link
  509	              className={styles.myOrdersLink}
  510	              to={`/store/${business.slug}/track/${myOrders.forThisShop[0].code}`}
  511	            >
  512	              Check the latest
  513	            </Link>
  514	          </div>
  515	        )}
  516	
  517	        {sections.featured && featured.length > 0 && !isService && (
  518	          <section className={styles.section} style={{ order: orderOf("featured") }} aria-labelledby="featured-heading">
  519	            <h2 className={styles.sectionHeading} id="featured-heading">
  520	              Featured
  521	            </h2>
  522	            <div className={styles.featuredRow}>
  523	              {featured.map((product) => (
  524	                <StoreProductCard
  525	                  key={product.id}
  526	                  product={product}
  527	                  to={`/store/${business.slug}/p/${product.slug}`}
  528	                  onAdd={() => handleAdd(product)}
  529	                  className={styles.featuredCard}
  530	                />
  531	              ))}
  532	            </div>
  533	          </section>
  534	        )}
  535	
  536	        {sections.catalogue !== false && <section className={styles.section} id="catalogue" style={{ order: orderOf("catalogue") }}>
  537	          <div className={styles.catalogueHead}>
  538	            <h2 className={styles.sectionHeading}>
  539	              {isService && services.length > 0 ? "Products" : isService ? "What we do" : "Products & Services"}
  540	            </h2>
  541	            <div className={styles.searchWrap}>
  542	              <Search size={16} className={styles.searchIcon} />
  543	              <Input
  544	                className={styles.searchInput}
  545	                value={search}
  546	                onChange={(event) => setSearch(event.target.value)}
  547	                placeholder={isService ? "Search services" : "Search products"}
  548	                aria-label="Search"
  549	              />
  550	            </div>
  551	          </div>
  552	
  553	          {categories.length > 0 && (
  554	            <div className={styles.chips}>
  555	              <button
  556	                type="button"
  557	                className={`${styles.chip} ${activeCategory === null ? styles.chipActive : ""}`}
  558	                onClick={() => setActiveCategory(null)}
  559	              >
  560	                All
  561	              </button>
  562	              {categories.map((category) => (
  563	                <button
  564	                  key={category.id}
  565	                  type="button"
  566	                  className={`${styles.chip} ${activeCategory === category.id ? styles.chipActive : ""}`}
  567	                  onClick={() => setActiveCategory(category.id)}
  568	                >
  569	                  {category.name}
  570	                </button>
  571	              ))}
  572	            </div>
  573	          )}
  574	
  575	          {visibleProducts.length > 0 ? (
  576	            <div className={isService ? styles.rows : styles.grid}>
  577	              {visibleProducts.map((product) => (
  578	                <StoreProductCard
  579	                  key={product.id}
  580	                  product={product}
  581	                  to={`/store/${business.slug}/p/${product.slug}`}
  582	                  layout={isService ? "row" : "grid"}
  583	                  onAdd={() => handleAdd(product)}
  584	                />
  585	              ))}
  586	            </div>
  587	          ) : (
  588	            <div className={styles.empty}>
  589	              <p className={styles.emptyTitle}>
  590	                {products.length === 0
  591	                  ? "This shop has not listed anything yet."
  592	                  : "Nothing matches that search."}
  593	              </p>
  594	              <p className={styles.emptyBody}>
  595	                {products.length === 0
  596	                  ? "Message the business directly and ask what is available."
  597	                  : "Try a different word, or message the shop and ask."}
  598	              </p>
  599	              {whatsappNumber && (
  600	                <Button asChild variant="outline">
  601	                  <a href={enquiryUrl} target="_blank" rel="noopener noreferrer">
  602	                    <MessageCircle size={16} />
  603	                    Ask on WhatsApp
  604	                  </a>
  605	                </Button>
  606	              )}
  607	            </div>
  608	          )}
  609	        </section>}
  610	
  611	        {sections.about !== false && business.description && (
  612	          <section className={styles.section} id="about" style={{ order: orderOf("about") }}>
  613	            <h2 className={styles.sectionHeading}>About</h2>
  614	            <p className={styles.prose}>{business.description}</p>
  615	          </section>
  616	        )}
  617	
  618	        {sections.work !== false && portfolio.length > 0 && (
  619	          <section className={styles.section} id="work" style={{ order: orderOf("work") }}>
  620	            <h2 className={styles.sectionHeading}>Recent work</h2>
  621	            <div className={styles.workGrid}>
  622	              {portfolio.map((item) => {
  623	                const card = (
  624	                  <>
  625	                    <div className={styles.workMedia}>
  626	                      {item.imageUrl ? (
  627	                        <img
  628	                          src={item.imageUrl}
  629	                          alt={item.title}
  630	                          className={styles.workImage}
  631	                          loading="lazy"
  632	                          decoding="async"
  633	                        />
  634	                      ) : null}
  635	                    </div>
  636	                    <span className={styles.workTitle}>
  637	                      {item.title}
  638	                      {item.linkUrl && <ExternalLink size={13} />}
  639	                    </span>
  640	                    {item.description && (
  641	                      <span className={styles.workBody}>{item.description}</span>
  642	                    )}
  643	                  </>
  644	                );
  645	                return item.linkUrl ? (
  646	                  <a
  647	                    key={item.id}
  648	                    href={item.linkUrl}
  649	                    target="_blank"
  650	                    rel="noopener noreferrer"
  651	                    className={styles.workCard}
  652	                  >
  653	                    {card}
  654	                  </a>
  655	                ) : (
  656	                  <a key={item.id} href={item.imageUrl || "#work"} target={item.imageUrl ? "_blank" : undefined} rel={item.imageUrl ? "noopener noreferrer" : undefined} className={styles.workCard}>
  657	                    {card}
  658	                  </a>
  659	                );
  660	              })}
  661	            </div>
  662	          </section>
  663	        )}
  664	
  665	        {sections.blog && blogPosts.length > 0 && (
  666	          <section className={styles.section} id="blog" style={{ order: orderOf("blog") }}>
  667	            <h2 className={styles.sectionHeading}>From the business</h2>
  668	            <div className={styles.blogGrid}>
  669	              {blogPosts.map((post) => (
  670	                <article key={post.id} className={styles.blogCard}>
  671	                  {post.coverImageUrl && <img src={post.coverImageUrl} alt="" className={styles.blogImage} loading="lazy" decoding="async" />}
  672	                  <div className={styles.blogBody}>
  673	                    <h3 className={styles.blogTitle}>{post.title}</h3>
  674	                    {post.excerpt && <p className={styles.blogExcerpt}>{post.excerpt}</p>}
  675	                    <Link to={`/store/${business.slug}/b/${post.slug}`}>Read full article →</Link>
  676	                  </div>
  677	                </article>
  678	              ))}
  679	            </div>
  680	          </section>
  681	        )}
  682	
  683	        {sections.testimonials !== false && testimonials.length > 0 && (
  684	          <section className={styles.section} id="testimonials" style={{ order: orderOf("testimonials") }}>
  685	            <h2 className={styles.sectionHeading}>{typeof content.testimonialsHeading === "string" && content.testimonialsHeading ? content.testimonialsHeading : "What customers say"}</h2>
  686	            {typeof content.testimonialsIntro === "string" && content.testimonialsIntro && (
  687	              <p className={styles.prose}>{content.testimonialsIntro}</p>
  688	            )}
  689	            <div className={styles.testimonialGrid}>
  690	              {testimonials.map((item) => (
  691	                <figure key={item.id} className={styles.testimonial}>
  692	                  {item.rating !== null && (
  693	                    <div className={styles.rating} aria-label={`${item.rating} out of 5`}>
  694	                      {[1, 2, 3, 4, 5].map((value) => (
  695	                        <Star
  696	                          key={value}
  697	                          size={14}
  698	                          className={
  699	                            value <= (item.rating ?? 0)
  700	                              ? styles.starOn
  701	                              : styles.starOff
  702	                          }
  703	                        />
  704	                      ))}
  705	                    </div>
  706	                  )}
  707	                  <blockquote className={styles.quote}>{item.quote}</blockquote>
  708	                  <figcaption className={styles.attribution}>
  709	                    {item.authorName}
  710	                    {item.authorRole && (
  711	                      <span className={styles.authorRole}>
  712	                        {item.authorRole}
  713	                      </span>
  714	                    )}
  715	                  </figcaption>
  716	                </figure>
  717	              ))}
  718	            </div>
  719	          </section>
  720	        )}
  721	
  722	        {sections.contact !== false && <section className={styles.section} id="contact" style={{ order: orderOf("contact") }}>
  723	          <h2 className={styles.sectionHeading}>Contact</h2>
  724	          <ul className={styles.contactList}>
  725	            {business.phone && (
  726	              <li className={styles.contactItem}>
  727	                <Phone size={16} className={styles.contactIcon} />
  728	                <a
  729	                  className={styles.contactLink}
  730	                  href={`tel:${business.phone.replace(/\s/g, "")}`}
  731	                >
  732	                  {business.phone}
  733	                </a>
  734	              </li>
  735	            )}
  736	            {whatsappNumber && (
  737	              <li className={styles.contactItem}>
  738	                <MessageCircle size={16} className={styles.contactIcon} />
  739	                <a
  740	                  className={styles.contactLink}
  741	                  href={enquiryUrl}
  742	                  target="_blank"
  743	                  rel="noopener noreferrer"
  744	                >
  745	                  Message on WhatsApp
  746	                </a>
  747	              </li>
  748	            )}
  749	            {business.address && (
  750	              <li className={styles.contactItem}>
  751	                <MapPin size={16} className={styles.contactIcon} />
  752	                <span>{business.address}</span>
  753	              </li>
  754	            )}
  755	            {business.openingHours && (
  756	              <li className={styles.contactItem}>
  757	                <Clock size={16} className={styles.contactIcon} />
  758	                <span>{business.openingHours}</span>
  759	              </li>
  760	            )}
  761	          </ul>
  762	
  763	          <div className={styles.enquiryForm}>
  764	            <h3 className={styles.enquiryTitle}>Send a message</h3>
  765	            {enquirySent ? (
  766	              <p className={styles.enquirySent}>
  767	                Thank you — your message has been sent. {business.name} will get
  768	                back to you.
  769	              </p>
  770	            ) : (
  771	              <>
  772	                <div className={styles.enquiryFields}>
  773	                  <Input
  774	                    value={enquiry.name}
  775	            
... (output capped at 40000 chars — re-read with offset/limit)
