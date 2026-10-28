import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImageOff, Pencil, Plus, Star, Trash2, Upload, X } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
   10	import { Switch } from "../components/Switch";
   11	import { Textarea } from "../components/Textarea";
   12	import { uploadImage } from "../helpers/uploadImage";
   13	import { useMyBusiness } from "../helpers/useMyBusiness";
   14	import { usePresence } from "../helpers/usePresence";
   15	import { useSaveBusiness } from "../helpers/useSaveBusiness";
   16	import { useSubscriptionStatus } from "../helpers/useSubscriptionStatus";
   17	import styles from "./dashboard.presence.module.css";
   18	
   19	type TestimonialDraft = {
   20	  id: string | null;
   21	  authorName: string;
   22	  authorRole: string;
   23	  quote: string;
   24	  rating: number | null;
   25	  published: boolean;
   26	  sortOrder: number;
   27	};
   28	
   29	type PortfolioDraft = {
   30	  id: string | null;
   31	  title: string;
   32	  description: string;
   33	  imageUrl: string | null;
   34	  linkUrl: string;
   35	  sortOrder: number;
   36	};
   37	
   38	type HomeSlideDraft = {
   39	  id: string;
   40	  imageUrl: string;
   41	  headline: string;
   42	  text: string;
   43	  ctaLabel: string;
   44	  ctaUrl: string;
   45	};
   46	
   47	const PresencePage = () => {
   48	  const { data: businessData, isFetching: loadingBusiness } = useMyBusiness();
   49	  const { data: subscription } = useSubscriptionStatus();
   50	  const { list, save, remove } = usePresence();
   51	  const saveBusiness = useSaveBusiness();
   52	
   53	  const business = businessData?.business ?? null;
   54	  const canUsePremiumPlus = subscription?.isPremiumPlus ?? false;
   55	  const canEdit = list.data?.canEdit ?? false;
   56	  const testimonials = list.data?.testimonials ?? [];
   57	  const portfolio = list.data?.portfolio ?? [];
   58	
   59	  const [hero, setHero] = useState({
   60	    headline: "",
   61	    subtext: "",
   62	    ctaLabel: "",
   63	    imageUrl: null as string | null,
   64	  });
   65	  const [heroLoaded, setHeroLoaded] = useState(false);
   66	  const [heroUploading, setHeroUploading] = useState(false);
   67	  const heroFileRef = useRef<HTMLInputElement>(null);
   68	
   69	  const [testimonialDraft, setTestimonialDraft] =
   70	    useState<TestimonialDraft | null>(null);
   71	  const [portfolioDraft, setPortfolioDraft] = useState<PortfolioDraft | null>(
   72	    null,
   73	  );
   74	  const [portfolioUploading, setPortfolioUploading] = useState(false);
   75	  const portfolioFileRef = useRef<HTMLInputElement>(null);
   76	  const [confirming, setConfirming] = useState<string | null>(null);
   77	  const [homeSlides, setHomeSlides] = useState<HomeSlideDraft[]>([]);
   78	  const [homepageVideoUrl, setHomepageVideoUrl] = useState("");
   79	  const [mediaLoaded, setMediaLoaded] = useState(false);
   80	  const [slideUploading, setSlideUploading] = useState<string | null>(null);
   81	  const slideFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
   82	
   83	  useEffect(() => {
   84	    if (!business || heroLoaded) return;
   85	    setHero({
   86	      headline: business.heroHeadline ?? "",
   87	      subtext: business.heroSubtext ?? "",
   88	      ctaLabel: business.heroCtaLabel ?? "",
   89	      imageUrl: business.heroImageUrl,
   90	    });
   91	    setHeroLoaded(true);
   92	  }, [business, heroLoaded]);
   93	
   94	  useEffect(() => {
   95	    if (!business || mediaLoaded) return;
   96	    const settings = business.contentSettings && typeof business.contentSettings === "object" && !Array.isArray(business.contentSettings)
   97	      ? business.contentSettings as Record<string, unknown>
   98	      : {};
   99	    const rawSlides = Array.isArray(settings.homepageSlides) ? settings.homepageSlides : [];
  100	    setHomeSlides(rawSlides.slice(0, 5).flatMap((raw, index) => {
  101	      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  102	      const slide = raw as Record<string, unknown>;
  103	      return [{
  104	        id: typeof slide.id === "string" ? slide.id : `slide-${index + 1}`,
  105	        imageUrl: typeof slide.imageUrl === "string" ? slide.imageUrl : "",
  106	        headline: typeof slide.headline === "string" ? slide.headline : "",
  107	        text: typeof slide.text === "string" ? slide.text : "",
  108	        ctaLabel: typeof slide.ctaLabel === "string" ? slide.ctaLabel : "",
  109	        ctaUrl: typeof slide.ctaUrl === "string" ? slide.ctaUrl : "",
  110	      }];
  111	    }));
  112	    setHomepageVideoUrl(typeof settings.homepageVideoUrl === "string" ? settings.homepageVideoUrl : "");
  113	    setMediaLoaded(true);
  114	  }, [business, mediaLoaded]);
  115	
  116	  const saveHero = async (next = hero) => {
  117	    if (!business) return;
  118	    try {
  119	      await saveBusiness.mutateAsync({
  120	        name: business.name,
  121	        slug: business.slug,
  122	        description: business.description,
  123	        logoUrl: business.logoUrl,
  124	        heroHeadline: next.headline,
  125	        heroSubtext: next.subtext,
  126	        heroImageUrl: next.imageUrl,
  127	        heroCtaLabel: next.ctaLabel,
  128	        phone: business.phone,
  129	        whatsappNumber: business.whatsappNumber,
  130	        email: business.email,
  131	        address: business.address,
  132	        openingHours: business.openingHours,
  133	        themeId: business.themeId,
  134	        currency: business.currency,
  135	        status: business.status === "published" ? "published" : "draft",
  136	      });
  137	      toast.success("Hero saved.");
  138	    } catch (err) {
  139	      toast.error(
  140	        err instanceof Error ? err.message : "Could not save the hero.",
  141	      );
  142	    }
  143	  };
  144	
  145	  const saveHomeMedia = async () => {
  146	    if (!business || !canUsePremiumPlus) return;
  147	    const existingSettings = business.contentSettings && typeof business.contentSettings === "object" && !Array.isArray(business.contentSettings)
  148	      ? business.contentSettings as Record<string, unknown>
  149	      : {};
  150	    try {
  151	      await saveBusiness.mutateAsync({
  152	        name: business.name, slug: business.slug, description: business.description,
  153	        logoUrl: business.logoUrl, heroHeadline: business.heroHeadline, heroSubtext: business.heroSubtext,
  154	        heroImageUrl: business.heroImageUrl, heroCtaLabel: business.heroCtaLabel,
  155	        phone: business.phone, whatsappNumber: business.whatsappNumber, email: business.email,
  156	        address: business.address, openingHours: business.openingHours, themeId: business.themeId,
  157	        currency: business.currency, status: business.status,
  158	        contentSettings: { ...existingSettings, homepageSlides: homeSlides, homepageVideoUrl } as any,
  159	      });
  160	      toast.success("Homepage slider and video settings saved.");
  161	    } catch (err) {
  162	      toast.error(err instanceof Error ? err.message : "Could not save homepage media.");
  163	    }
  164	  };
  165	
  166	  const updateHomeSlide = (id: string, field: keyof Omit<HomeSlideDraft, "id">, value: string) => {
  167	    setHomeSlides((current) => current.map((slide) => slide.id === id ? { ...slide, [field]: value } : slide));
  168	  };
  169	
  170	  const uploadHomeSlideImage = async (id: string, file: File | undefined) => {
  171	    if (!file || !canUsePremiumPlus) return;
  172	    setSlideUploading(id);
  173	    try {
  174	      const imageUrl = await uploadImage(file, "gallery");
  175	      updateHomeSlide(id, "imageUrl", imageUrl);
  176	      toast.success("Slide image uploaded. Save the slider to publish it.");
  177	    } catch (err) {
  178	      toast.error(err instanceof Error ? err.message : "Slide image upload failed.");
  179	    } finally {
  180	      setSlideUploading(null);
  181	      const input = slideFileRefs.current[id];
  182	      if (input) input.value = "";
  183	    }
  184	  };
  185	
  186	  const moveHomeSlide = (index: number, offset: -1 | 1) => {
  187	    setHomeSlides((current) => {
  188	      const target = index + offset;
  189	      if (target < 0 || target >= current.length) return current;
  190	      const next = [...current];
  191	      [next[index], next[target]] = [next[target], next[index]];
  192	      return next;
  193	    });
  194	  };
  195	
  196	  const uploadHero = async (file: File | undefined) => {
  197	    if (!file) return;
  198	    setHeroUploading(true);
  199	    try {
  200	      const url = await uploadImage(file, "logo");
  201	      const next = { ...hero, imageUrl: url };
  202	      setHero(next);
  203	      await saveHero(next);
  204	    } catch (err) {
  205	      toast.error(err instanceof Error ? err.message : "Upload failed.");
  206	    } finally {
  207	      setHeroUploading(false);
  208	      if (heroFileRef.current) heroFileRef.current.value = "";
  209	    }
  210	  };
  211	
  212	  const uploadPortfolioImage = async (file: File | undefined) => {
  213	    if (!file || !portfolioDraft) return;
  214	    setPortfolioUploading(true);
  215	    try {
  216	      const url = await uploadImage(file, "product");
  217	      setPortfolioDraft((current) =>
  218	        current ? { ...current, imageUrl: url } : current,
  219	      );
  220	    } catch (err) {
  221	      toast.error(err instanceof Error ? err.message : "Upload failed.");
  222	    } finally {
  223	      setPortfolioUploading(false);
  224	      if (portfolioFileRef.current) portfolioFileRef.current.value = "";
  225	    }
  226	  };
  227	
  228	  const submitTestimonial = async () => {
  229	    if (!testimonialDraft) return;
  230	    try {
  231	      await save.mutateAsync({
  232	        kind: "testimonial",
  233	        id: testimonialDraft.id,
  234	        authorName: testimonialDraft.authorName,
  235	        authorRole: testimonialDraft.authorRole,
  236	        quote: testimonialDraft.quote,
  237	        rating: testimonialDraft.rating,
  238	        published: testimonialDraft.published,
  239	        sortOrder: testimonialDraft.sortOrder,
  240	      });
  241	      toast.success("Testimonial saved.");
  242	      setTestimonialDraft(null);
  243	    } catch (err) {
  244	      toast.error(err instanceof Error ? err.message : "Could not save.");
  245	    }
  246	  };
  247	
  248	  const submitPortfolio = async () => {
  249	    if (!portfolioDraft) return;
  250	    try {
  251	      await save.mutateAsync({
  252	        kind: "portfolio",
  253	        id: portfolioDraft.id,
  254	        title: portfolioDraft.title,
  255	        description: portfolioDraft.description,
  256	        imageUrl: portfolioDraft.imageUrl,
  257	        linkUrl: portfolioDraft.linkUrl,
  258	        sortOrder: portfolioDraft.sortOrder,
  259	      });
  260	      toast.success("Work saved.");
  261	      setPortfolioDraft(null);
  262	    } catch (err) {
  263	      toast.error(err instanceof Error ? err.message : "Could not save.");
  264	    }
  265	  };
  266	
  267	  const deleteItem = async (kind: "testimonial" | "portfolio", id: string) => {
  268	    try {
  269	      await remove.mutateAsync({ kind, id });
  270	      toast.success("Removed.");
  271	      setConfirming(null);
  272	    } catch (err) {
  273	      toast.error(err instanceof Error ? err.message : "Could not delete.");
  274	    }
  275	  };
  276	
  277	  if ((loadingBusiness && !businessData) || (list.isFetching && !list.data)) {
  278	    return (
  279	      <div className={styles.page}>
  280	        <Skeleton className={styles.skeletonTitle} />
  281	        <Skeleton className={styles.skeletonBlock} />
  282	      </div>
  283	    );
  284	  }
  285	
  286	  return (
  287	    <div className={styles.page}>
  288	      <Helmet>
  289	        <title>Presence — Oniduka</title>
  290	      </Helmet>
  291	
  292	      <div>
  293	        <h1 className={styles.title}>Presence</h1>
  294	        <p className={styles.subtitle}>
  295	          The parts that make your page look like a business rather than a
  296	          list: an opening statement, proof from customers, and work you have
  297	          done.
  298	        </p>
  299	      </div>
  300	
  301	      {!canEdit && (
  302	        <p className={styles.notice}>
  303	          These sections are part of Premium. Anything already added stays on
  304	          your page and can still be removed.{" "}
  305	          <Link to="/dashboard/plan" className={styles.inlineLink}>
  306	            See Premium
  307	          </Link>
  308	        </p>
  309	      )}
  310	
  311	      <section className={styles.group}>
  312	        <h2 className={styles.groupTitle}>Hero</h2>
  313	
  314	        <div className={styles.imageField}>
  315	          <div className={styles.heroPreview}>
  316	            {hero.imageUrl ? (
  317	              <img src={hero.imageUrl} alt="" className={styles.heroImage} />
  318	            ) : (
  319	              <ImageOff size={20} className={styles.icon} />
  320	            )}
  321	          </div>
  322	          <div className={styles.imageActions}>
  323	            <input
  324	              ref={heroFileRef}
  325	              type="file"
  326	              accept="image/png,image/jpeg,image/webp"
  327	              className={styles.fileInput}
  328	              onChange={(event) => {
  329	                void uploadHero(event.target.files?.[0]);
  330	              }}
  331	            />
  332	            <Button
  333	              variant="outline"
  334	              size="sm"
  335	              disabled={!canEdit || heroUploading}
  336	              onClick={() => heroFileRef.current?.click()}
  337	            >
  338	              {heroUploading ? <Spinner size="sm" /> : <Upload size={15} />}
  339	              {hero.imageUrl ? "Replace image" : "Upload image"}
  340	            </Button>
  341	            {hero.imageUrl && (
  342	              <Button
  343	                variant="ghost"
  344	                size="sm"
  345	                disabled={!canEdit}
  346	                onClick={() => {
  347	                  const next = { ...hero, imageUrl: null };
  348	                  setHero(next);
  349	                  void saveHero(next);
  350	                }}
  351	              >
  352	                Remove
  353	              </Button>
  354	            )}
  355	            <span className={styles.hint}>
  356	              A wide photo of your shop or work. PNG, JPG or WebP, up to 3 MB.
  357	            </span>
  358	          </div>
  359	        </div>
  360	
  361	        <label className={styles.field}>
  362	          <span className={styles.label}>Headline</span>
  363	          <Input
  364	            value={hero.headline}
  365	            disabled={!canEdit}
  366	            onChange={(event) =>
  367	              setHero({ ...hero, headline: event.target.value })
  368	            }
  369	            placeholder="Same-day phone repairs in Ikeja"
  370	          />
  371	        </label>
  372	
  373	        <label className={styles.field}>
  374	          <span className={styles.label}>Supporting line</span>
  375	          <Textarea
  376	            value={hero.subtext}
  377	            disabled={!canEdit}
  378	            onChange={(event) =>
  379	              setHero({ ...hero, subtext: event.target.value })
  380	            }
  381	            rows={2}
  382	            placeholder="Walk in with a cracked screen, walk out the same afternoon."
  383	          />
  384	        </label>
  385	
  386	        <label className={styles.field}>
  387	          <span className={styles.label}>Button text</span>
  388	          <Input
  389	            value={hero.ctaLabel}
  390	            disabled={!canEdit}
  391	            onChange={(event) =>
  392	              setHero({ ...hero, ctaLabel: event.target.value })
  393	            }
  394	            placeholder="Book a repair"
  395	            className={styles.shortInput}
  396	          />
  397	          <span className={styles.hint}>
  398	            Opens WhatsApp. Leave blank to use the default button.
  399	          </span>
  400	        </label>
  401	
  402	        <div className={styles.formActions}>
  403	          <Button
  404	            disabled={!canEdit || saveBusiness.isPending}
  405	            onClick={() => {
  406	              void saveHero();
  407	            }}
  408	          >
  409	            {saveBusiness.isPending ? <Spinner size="sm" /> : null}
  410	            Save hero
  411	          </Button>
  412	        </div>
  413	      </section>
  414	
  415	      <section className={styles.group}>
  416	        <div className={styles.groupHead}>
  417	          <div>
  418	            <h2 className={styles.groupTitle}>Homepage slider & video</h2>
  419	            <p className={styles.hint}>Add up to five featured slides and one public YouTube or Facebook video.</p>
  420	          </div>
  421	          <Button
  422	            variant="outline"
  423	            size="sm"
  424	            disabled={!canUsePremiumPlus || homeSlides.length >= 5}
  425	            onClick={() => setHomeSlides((current) => [...current, { id: `slide-${Date.now()}`, imageUrl: "", headline: "", text: "", ctaLabel: "", ctaUrl: "" }])}
  426	          >
  427	            <Plus size={15} /> Add slide
  428	          </Button>
  429	        </div>
  430	
  431	        {!canUsePremiumPlus && (
  432	          <p className={styles.notice}>
  433	            The homepage slider and video section are Premium Plus features. Your current content stays saved. <Link to="/dashboard/plan" className={styles.inlineLink}>View plans</Link>
  434	          </p>
  435	        )}
  436	
  437	        {homeSlides.map((slide, index) => (
  438	          <article className={styles.draft} key={slide.id}>
  439	            <div className={styles.formHead}>
  440	              <h3 className={styles.formTitle}>Slide {index + 1}</h3>
  441	              <div className={styles.rowActions}>
  442	                <Button variant="ghost" size="icon-sm" disabled={!canUsePremiumPlus || index === 0} aria-label={`Move slide ${index + 1} up`} onClick={() => moveHomeSlide(index, -1)}><ArrowUp size={16} /></Button>
  443	                <Button variant="ghost" size="icon-sm" disabled={!canUsePremiumPlus || index === homeSlides.length - 1} aria-label={`Move slide ${index + 1} down`} onClick={() => moveHomeSlide(index, 1)}><ArrowDown size={16} /></Button>
  444	                <Button variant="ghost" size="icon-sm" disabled={!canUsePremiumPlus} aria-label={`Remove slide ${index + 1}`} onClick={() => setHomeSlides((current) => current.filter((item) => item.id !== slide.id))}><Trash2 size={16} /></Button>
  445	              </div>
  446	            </div>
  447	            <div className={styles.imageField}>
  448	              <div className={styles.heroPreview}>
  449	                {slide.imageUrl ? <img src={slide.imageUrl} alt="" className={styles.heroImage} /> : <ImageOff size={20} className={styles.icon} />}
  450	              </div>
  451	              <div className={styles.imageActions}>
  452	                <input ref={(node) => { slideFileRefs.current[slide.id] = node; }} type="file" accept="image/png,image/jpeg,image/webp" className={styles.fileInput} disabled={!canUsePremiumPlus} onChange={(event) => { void uploadHomeSlideImage(slide.id, event.target.files?.[0]); }} />
  453	                <Button variant="outline" size="sm" disabled={!canUsePremiumPlus || slideUploading === slide.id} onClick={() => slideFileRefs.current[slide.id]?.click()}>
  454	                  {slideUploading === slide.id ? <Spinner size="sm" /> : <Upload size={15} />}{slide.imageUrl ? "Replace image" : "Upload image"}
  455	                </Button>
  456	                <span className={styles.hint}>PNG, JPG or WebP, up to 3 MB.</span>
  457	              </div>
  458	            </div>
  459	            <label className={styles.field}><span className={styles.label}>Headline</span><Input value={slide.headline} disabled={!canUsePremiumPlus} onChange={(event) => updateHomeSlide(slide.id, "headline", event.target.value)} placeholder="A headline for this slide" /></label>
  460	            <label className={styles.field}><span className={styles.label}>Supporting text</span><Textarea value={slide.text} disabled={!canUsePremiumPlus} onChange={(event) => updateHomeSlide(slide.id, "text", event.target.value)} rows={2} placeholder="Short supporting message" /></label>
  461	            <div className={styles.twoUp}>
  462	              <label className={styles.field}><span className={styles.label}>Button text</span><Input value={slide.ctaLabel} disabled={!canUsePremiumPlus} onChange={(event) => updateHomeSlide(slide.id, "ctaLabel", event.target.value)} placeholder="Learn more" /></label>
  463	              <label className={styles.field}><span className={styles.label}>Button link</span><Input value={slide.ctaUrl} disabled={!canUsePremiumPlus} onChange={(event) => updateHomeSlide(slide.id, "ctaUrl", event.target.value)} placeholder="https://example.com or /contact" /></label>
  464	            </div>
  465	          </article>
  466	        ))}
  467	
  468	        <label className={styles.field}>
  469	          <span className={styles.label}>YouTube or Facebook video URL</span>
  470	          <Input value={homepageVideoUrl} disabled={!canUsePremiumPlus} onChange={(event) => setHomepageVideoUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
  471	          <span className={styles.hint}>Use a public video link. Private, restricted or removed videos cannot be embedded.</span>
  472	        </label>
  473	        <div className={styles.formActions}>
  474	          <Button disabled={!canUsePremiumPlus || saveBusiness.isPending} onClick={() => void saveHomeMedia()}>{saveBusiness.isPending ? <Spinner size="sm" /> : null}Save slider & video</Button>
  475	        </div>
  476	      </section>
  477	
  478	      <section className={styles.group}>
  479	        <div className={styles.groupHead}>
  480	          <h2 className={styles.groupTitle}>Testimonials</h2>
  481	          {!testimonialDraft && (
  482	            <Button
  483	              variant="outline"
  484	              size="sm"
  485	              disabled={!canEdit}
  486	              onClick={() =>
  487	                setTestimonialDraft({
  488	                  id: null,
  489	                  authorName: "",
  490	                  authorRole: "",
  491	                  quote: "",
  492	                  rating: 5,
  493	                  published: true,
  494	                  sortOrder: testimonials.length,
  495	                })
  496	              }
  497	            >
  498	              <Plus size={15} />
  499	              Add
  500	            </Button>
  501	          )}
  502	        </div>
  503	
  504	        {testimonialDraft && (
  505	          <div className={styles.draft}>
  506	            <div className={styles.formHead}>
  507	              <h3 className={styles.formTitle}>
  508	                {testimonialDraft.id ? "Edit testimonial" : "New testimonial"}
  509	              </h3>
  510	              <Button
  511	                variant="ghost"
  512	                size="icon-sm"
  513	                onClick={() => setTestimonialDraft(null)}
  514	                aria-label="Cancel"
  515	              >
  516	                <X size={16} />
  517	              </Button>
  518	            </div>
  519	
  520	            <Textarea
  521	              value={testimonialDraft.quote}
  522	              onChange={(event) =>
  523	                setTestimonialDraft({
  524	                  ...testimonialDraft,
  525	                  quote: event.target.value,
  526	                })
  527	              }
  528	              rows={3}
  529	              placeholder="What the customer said, in their words."
  530	              aria-label="Testimonial"
  531	            />
  532	
  533	            <div className={styles.twoUp}>
  534	              <Input
  535	                value={testimonialDraft.authorName}
  536	                onChange={(event) =>
  537	                  setTestimonialDraft({
  538	                    ...testimonialDraft,
  539	                    authorName: event.target.value,
  540	                  })
  541	                }
  542	                placeholder="Customer name"
  543	                aria-label="Customer name"
  544	              />
  545	              <Input
  546	                value={testimonialDraft.authorRole}
  547	                onChange={(event) =>
  548	                  setTestimonialDraft({
  549	                    ...testimonialDraft,
  550	                    authorRole: event.target.value,
  551	                  })
  552	                }
  553	                placeholder="Where they are from (optional)"
  554	                aria-label="Customer role"
  555	              />
  556	            </div>
  557	
  558	            <div className={styles.ratingRow}>
  559	              <span className={styles.label}>Rating</span>
  560	              <div className={styles.stars}>
  561	                {[1, 2, 3, 4, 5].map((value) => (
  562	                  <button
  563	                    key={value}
  564	                    type="button"
  565	                    className={styles.starButton}
  566	                    aria-label={`${value} stars`}
  567	                    onClick={() =>
  568	                      setTestimonialDraft({
  569	                        ...testimonialDraft,
  570	                        rating:
  571	                          testimonialDraft.rating === value ? null : value,
  572	                      })
  573	                    }
  574	                  >
  575	                    <Star
  576	                      size={18}
  577	                      className={
  578	                        testimonialDraft.rating !== null &&
  579	                        value <= testimonialDraft.rating
  580	                          ? styles.starOn
  581	                          : styles.starOff
  582	                      }
  583	                    />
  584	                  </button>
  585	                ))}
  586	              </div>
  587	            </div>
  588	
  589	            <div className={styles.switchRow}>
  590	              <Switch
  591	                id="published"
  592	                checked={testimonialDraft.published}
  593	                onCheckedChange={(checked) =>
  594	                  setTestimonialDraft({
  595	                    ...testimonialDraft,
  596	                    published: checked,
  597	                  })
  598	                }
  599	              />
  600	              <label htmlFor="published" className={styles.label}>
  601	                Show on my page
  602	              </label>
  603	            </div>
  604	
  605	            <div className={styles.formActions}>
  606	              <Button
  607	                disabled={
  608	                  save.isPending ||
  609	                  testimonialDraft.authorName.trim().length === 0 ||
  610	                  testimonialDraft.quote.trim().length < 4
  611	                }
  612	                onClick={() => {
  613	                  void submitTestimonial();
  614	                }}
  615	              >
  616	                {save.isPending ? <Spinner size="sm" /> : null}
  617	                Save
  618	              </Button>
  619	              <Button
  620	                variant="ghost"
  621	                onClick={() => setTestimonialDraft(null)}
  622	              >
  623	                Cancel
  624	              </Button>
  625	            </div>
  626	          </div>
  627	        )}
  628	
  629	        {testimonials.length === 0 && !testimonialDraft ? (
  630	          <p className={styles.hint}>
  631	            Nothing yet. One honest line from a real customer does more than a
  632	            page of description.
  633	          </p>
  634	        ) : (
  635	          <ul className={styles.list}>
  636	            {testimonials.map((item) => (
  637	              <li key={item.id} className={styles.row}>
  638	                <div className={styles.rowText}>
  639	                  <span className={styles.quote}>{item.quote}</span>
  640	                  <span className={styles.rowMeta}>
  641	                    {item.authorName}
  642	                    {item.authorRole ? ` · ${item.authorRole}` : ""}
  643	                    {item.rating ? ` · ${item.rating}/5` : ""}
  644	                    {item.published ? "" : " · hidden"}
  645	                  </span>
  646	                </div>
  647	                <div className={styles.rowActions}>
  648	                  <Button
  649	                    variant="outline"
  650	                    size="icon-sm"
  651	                    disabled={!canEdit}
  652	                    aria-label="Edit testimonial"
  653	                    onClick={() =>
  654	                      setTestimonialDraft({
  655	                        id: item.id,
  656	                        authorName: item.authorName,
  657	                        authorRole: item.authorRole ?? "",
  658	                        quote: item.quote,
  659	                        rating: item.rating,
  660	                        published: item.published,
  661	                        sortOrder: item.sortOrder,
  662	                      })
  663	                    }
  664	                  >
  665	                    <Pencil size={14} />
  666	                  </Button>
  667	                  {confirming === item.id ? (
  668	                    <>
  669	                      <Button
  670	                        variant="destructive"
  671	                        size="sm"
  672	                        disabled={remove.isPending}
  673	                        onClick={() => {
  674	                          void deleteItem("testimonial", item.id);
  675	                        }}
  676	                      >
  677	                        Delete
  678	                      </Button>
  679	                      <Button
  680	                        variant="ghost"
  681	                        size="sm"
  682	                        onClick={() => setConfirming(null)}
  683	                      >
  684	                        Cancel
  685	                      </Button>
  686	                    </>
  687	                  ) : (
  688	                    <Button
  689	                      variant="ghost"
  690	                      size="icon-sm"
  691	                      aria-label="Delete testimonial"
  692	                      onClick={() => setConfirming(item.id)}
  693	                    >
  694	                      <Trash2 size={14} />
  695	                    </Button>
  696	                  )}
  697	                </div>
  698	              </li>
  699	            ))}
  700	          </ul>
  701	        )}
  702	      </section>
  703	
  704	      <section className={styles.group}>
  705	        <div className={styles.groupHead}>
  706	          <h2 className={styles.groupTitle}>Portfolio &amp; gallery</h2>
  707	          {!portfolioDraft && (
  708	            <Button
  709	              variant="outline"
  710	              size="sm"
  711	              disabled={!canEdit}
  712	              onClick={() =>
  713	                setPortfolioDraft({
  714	                  id: null,
  715	                  title: "",
  716	                  description: "",
  717	                  imageUrl: null,
  718	                  linkUrl: "",
  719	                  sortOrder: portfolio.length,
  720	                })
  721	              }
  722	            >
  723	              <Plus size={15} />
  724	              Add
  725	            </Button>
  726	          )}
  727	        </div>
  728	
  729	        {portfolioDraft && (
  730	          <div className={styles.draft}>
  731	            <div className={styles.formHead}>
  732	              <h3 className={styles.formTitle}>
  733	                {portfolioDraft.id ? "Edit work" : "Add work"}
  734	              </h3>
  735	              <Button
  736	                variant="ghost"
  737	                size="icon-sm"
  738	                onClick={() => setPortfolioDraft(null)}
  739	                aria-label="Cancel"
  740	              >
  741	                <X size={16} />
  742	              </Button>
  743	            </div>
  744	
  745	            <div className={styles.imageField}>
  746	              <div className={styles.preview}>
  747	                {portfolioDraft.imageUrl ? (
  748	                  <img
  749	                    src={portfolioDraft.imageUrl}
  750	                    alt=""
  751	                    className={styles.previewImage}
  752	                  />
  753	                ) : (
  754	                  <ImageOff size={18} className={styles.icon} />
  755	                )}
  756	              </div>
  757	              <div className={styles.imageActions}>
  758	                <input
  759	                  ref={portfolioFileRef}
  760	                  type="file"
  761	                  accept="image/png,image/jpeg,image/webp"
  762	                  className={styles.fileInput}
  763	                  onChange={(event) => {
  764	                    void uploadPortfolioImage(event.target.files?.[0]);
  765	                  }}
  766	                />
  767	                <Button
  768	                  variant="outline"
  769	                  size="sm"
  770	                  disabled={portfolioUploading}
  771	                  onClick={() => portfolioFileRef.current?.click()}
  772	                >
  773	                  {portfolioUploading ? (
  774	                    <Spinner size="sm" />
  775	                  ) : (
  776	                    <Upload size={15} />
  777	                  )}
  778	                  {portfolioDraft.imageUrl ? "Replace" : "Upload photo"}
  779	                </Button>
  780	                {portfolioDraft.imageUrl && (
  781	                  <Button
  782	                    variant="ghost"
  783	                    size="sm"
  784	                    onClick={() => setPortfolioDraft({ ...portfolioDraft, imageUrl: null })}
  785	                  >
  786	                    Remove
  787	                  </Button>
  788	                )}
  789	              </div>
  790	            </div>
  791	
  792	            <Input
  793	              value={portfolioDraft.title}
  794	              onChange={(event) =>
  795	                setPortfolioDraft({
  796	                  ...portfolioDraft,
  797	                  title: event.target.value,
  798	                })
  799	              }
  800	              placeholder="Wedding shoot, Lekki"
  801	              aria-label="Title"
  802	            />
  803	            <Textarea
  804	              value={portfolioDraft.description}
  805	              onChange={(event) =>
  806	                setPortfolioDraft({
  807	                  ...portfolioDraft,
  808	                  description: event.target.value,
  809	                })
  810	              }
  811	              rows={2}
  812	              placeholder="What the job involved (optional)"
  813	              aria-label="Description"
  814	            />
  815	            <Input
  816	              value={portfolioDraft.linkUrl}
  817	              onChange={(event) =>
  818	                setPortfolioDraft({
  819	                  ...portfolioDraft,
  820	                  linkUrl: event.target.value,
  821	                })
  822	              }
  823	              placeholder="Link (optional)"
  824	              aria-label="Link"
  825	            />
  826	
  827	            <div className={styles.formActions}>
  828	              <Button
  829	                disabled={
  830	                  save.isPending ||
  831	                  portfolioUploading ||
  832	                  portfolioDraft.title.trim().length === 0
  833	                }
  834	                onClick={() => {
  835	                  void submitPortfolio();
  836	                }}
  837	              >
  838	                {save.isPending ? <Spinner size="sm" /> : null}
  839	                Save
  840	              </Button>
  841	              <Button variant="ghost" onClick={() => setPortfolioDraft(null)}>
  842	                Cancel
  843	              </Button>
  844	            </div>
  845	          </div>
  846	        )}
  847	
  848	        {portfolio.length === 0 && !portfolioDraft ? (
  849	          <p className={styles.hint}>
  850	            Nothing yet. For a repair shop, barber or photographer, finished
  851	            work sells better than any description.
  852	          </p>
  853	        ) : (
  854	          <ul className={styles.list}>
  855	            {portfolio.map((item) => (
  856	              <li key={item.id} className={styles.row}>
  857	                <div className={styles.thumb}>
  858	                  {item.imageUrl ? (
  859	                    <img
  860	                      src={item.imageUrl}
  861	                      alt=""
  862	                      className={styles.thumbImage}
  863	                      loading="lazy"
  864	                    />
  865	                  ) : (
  866	                    <ImageOff size={15} className={styles.icon} />
  867	                  )}
  868	                </div>
  869	                <div className={styles.rowText}>
  870	                  <span className={styles.rowName}>{item.title}</span>
  871	                  {item.description && (
  872	                    <span className={styles.rowMeta}>{item.description}</span>
  873	                  )}
  874	                </div>
  875	                <div className={styles.rowActions}>
  876	                  <Button
  877	                    variant="outline"
  878	                    size="icon-sm"
  879	                    disabled={!canEdit}
  880	                    aria-label="Edit work"
  881	                    onClick={() =>
  882	                      setPortfolioDraft({
  883	                        id: item.id,
  884	                        title: item.title,
  885	                        description: item.description ?? "",
  886	                        imageUrl: item.imageUrl,
  887	                        linkUrl: item.linkUrl ?? "",
  888	                        sortOrder: item.sortOrder,
  889	                      })
  890	                    }
  891	                  >
  892	                    <Pencil size={14} />
  893	                  </Button>
  894	                  {confirming === item.id ? (
  895	                    <>
  896	                      <Button
  897	                        variant="destructive"
  898	                        size="sm"
  899	                        disabled={remove.isPending}
  900	                        onClick={() => {
  901	                          void deleteItem("portfolio", item.id);
  902	                        }}
  903	                      >
  904	                        Delete
  905	                      </Button>
  906	                      <Button
  907	                        variant="ghost"
  908	                        size="sm"
  909	                        onClick={() => setConfirming(null)}
  910	                      >
  911	    
... (output capped at 40000 chars — re-read with offset/limit)
