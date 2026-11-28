import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImageOff, Pencil, Plus, Star, Trash2, Upload, X } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Switch } from "../components/Switch";
import { Textarea } from "../components/Textarea";
import { uploadImage } from "../helpers/uploadImage";
import { uploadVideo } from "../helpers/uploadVideo";
import { useMyBusiness } from "../helpers/useMyBusiness";
import { usePresence } from "../helpers/usePresence";
import { useSaveBusiness } from "../helpers/useSaveBusiness";
import { useSubscriptionStatus } from "../helpers/useSubscriptionStatus";
import styles from "./dashboard.presence.module.css";

type TestimonialDraft = {
  id: string | null;
  authorName: string;
  authorRole: string;
  quote: string;
  rating: number | null;
  imageUrl: string | null;
  published: boolean;
  sortOrder: number;
};

type PortfolioDraft = {
  id: string | null;
  title: string;
  description: string;
  imageUrl: string | null;
  linkUrl: string;
  sortOrder: number;
};

type HomeSlideDraft = {
  id: string;
  imageUrl: string;
  headline: string;
  text: string;
  ctaLabel: string;
  ctaUrl: string;
};

const PresencePage = () => {
  const { data: businessData, isFetching: loadingBusiness } = useMyBusiness();
  const { data: subscription } = useSubscriptionStatus();
  const { list, save, remove } = usePresence();
  const saveBusiness = useSaveBusiness();

  const business = businessData?.business ?? null;
  const canUsePremiumPlus = subscription?.isPremiumPlus ?? false;
  const canEdit = list.data?.canEdit ?? false;
  const testimonials = list.data?.testimonials ?? [];
  const portfolio = list.data?.portfolio ?? [];

  const [hero, setHero] = useState({
    headline: "",
    subtext: "",
    ctaLabel: "",
    imageUrl: null as string | null,
  });
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);

  const [testimonialDraft, setTestimonialDraft] =
    useState<TestimonialDraft | null>(null);
  const [portfolioDraft, setPortfolioDraft] = useState<PortfolioDraft | null>(
    null,
  );
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [testimonialUploading, setTestimonialUploading] = useState(false);
  const testimonialFileRef = useRef<HTMLInputElement>(null);
  const portfolioFileRef = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [homeSlides, setHomeSlides] = useState<HomeSlideDraft[]>([]);
  const [homepageVideoUrl, setHomepageVideoUrl] = useState("");
  const [homepageVideoFileUrl, setHomepageVideoFileUrl] = useState("");
  const [homepageSliderPlacement, setHomepageSliderPlacement] = useState<"hero"|"section">("hero");
  const [homepageVideoPlacement, setHomepageVideoPlacement] = useState<"hero"|"section">("section");
  const [homepageVideoTitle, setHomepageVideoTitle] = useState("Watch our video");
  const [homepageVideoDescription, setHomepageVideoDescription] = useState("");
  const [homepageSliderInterval, setHomepageSliderInterval] = useState(5);
  const [videoUploading, setVideoUploading] = useState(false);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [slideUploading, setSlideUploading] = useState<string | null>(null);
  const slideFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!business || heroLoaded) return;
    setHero({
      headline: business.heroHeadline ?? "",
      subtext: business.heroSubtext ?? "",
      ctaLabel: business.heroCtaLabel ?? "",      imageUrl: business.heroImageUrl,
    });
    setHeroLoaded(true);
  }, [business, heroLoaded]);

  useEffect(() => {
    if (!business || mediaLoaded) return;
    const settings = business.contentSettings && typeof business.contentSettings === "object" && !Array.isArray(business.contentSettings)
      ? business.contentSettings as Record<string, unknown>
      : {};
    const rawSlides = Array.isArray(settings.homepageSlides) ? settings.homepageSlides : [];
    setHomeSlides(rawSlides.slice(0, 5).flatMap((raw, index) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
      const slide = raw as Record<string, unknown>;
      return [{
        id: typeof slide.id === "string" ? slide.id : `slide-${index + 1}`,
        imageUrl: typeof slide.imageUrl === "string" ? slide.imageUrl : "",
        headline: typeof slide.headline === "string" ? slide.headline : "",
        text: typeof slide.text === "string" ? slide.text : "",
        ctaLabel: typeof slide.ctaLabel === "string" ? slide.ctaLabel : "",
        ctaUrl: typeof slide.ctaUrl === "string" ? slide.ctaUrl : "",
      }];
    }));
    setHomepageVideoUrl(typeof settings.homepageVideoUrl === "string" ? settings.homepageVideoUrl : "");
    setHomepageVideoFileUrl(typeof settings.homepageVideoFileUrl === "string" ? settings.homepageVideoFileUrl : "");
    setHomepageSliderPlacement(settings.homepageSliderPlacement === "section" ? "section" : "hero");
    setHomepageVideoPlacement(settings.homepageVideoPlacement === "hero" ? "hero" : "section");
    setHomepageVideoTitle(typeof settings.homepageVideoTitle === "string" ? settings.homepageVideoTitle : "Watch our video");
    setHomepageVideoDescription(typeof settings.homepageVideoDescription === "string" ? settings.homepageVideoDescription : "");
    setHomepageSliderInterval(typeof settings.homepageSliderInterval === "number" ? Math.min(10,Math.max(3,settings.homepageSliderInterval)) : 5);
    setMediaLoaded(true);
  }, [business, mediaLoaded]);

  const saveHero = async (next = hero) => {
    if (!business) return;
    try {
      await saveBusiness.mutateAsync({
        name: business.name,
        slug: business.slug,
        description: business.description,
        logoUrl: business.logoUrl,
        heroHeadline: next.headline,
        heroSubtext: next.subtext,
        heroImageUrl: next.imageUrl,
        heroCtaLabel: next.ctaLabel,
        phone: business.phone,
        whatsappNumber: business.whatsappNumber,
        email: business.email,
        address: business.address,
        openingHours: business.openingHours,
        themeId: business.themeId,
        currency: business.currency,
        status: business.status === "published" ? "published" : "draft",
      });
      toast.success("Hero saved.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save the hero.",
      );
    }
  };

  const saveHomeMedia = async () => {
    if (!business || !canUsePremiumPlus) return;
    const existingSettings = business.contentSettings && typeof business.contentSettings === "object" && !Array.isArray(business.contentSettings)
      ? business.contentSettings as Record<string, unknown>
      : {};
    try {
      await saveBusiness.mutateAsync({
        name: business.name, slug: business.slug, description: business.description,
        logoUrl: business.logoUrl, heroHeadline: business.heroHeadline, heroSubtext: business.heroSubtext,
        heroImageUrl: business.heroImageUrl, heroCtaLabel: business.heroCtaLabel,
        phone: business.phone, whatsappNumber: business.whatsappNumber, email: business.email,
        address: business.address, openingHours: business.openingHours, themeId: business.themeId,
        currency: business.currency, status: business.status,
        contentSettings: { ...existingSettings, homepageSlides: homeSlides, homepageVideoUrl, homepageVideoFileUrl, homepageSliderPlacement, homepageVideoPlacement, homepageVideoTitle, homepageVideoDescription, homepageSliderInterval } as any,
      });
      toast.success("Homepage slider and video settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save homepage media.");
    }
  };

  const uploadHomepageVideo = async (file: File | undefined) => {
    if (!file || !canUsePremiumPlus) return;
    setVideoUploading(true);
    try {
      const url = await uploadVideo(file);
      setHomepageVideoFileUrl(url);
      setHomepageVideoUrl("");
      toast.success("Video uploaded. Save slider & video to publish it.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Video upload failed."); }
    finally { setVideoUploading(false); if (videoFileRef.current) videoFileRef.current.value = ""; }
  };

  const updateHomeSlide = (id: string, field: keyof Omit<HomeSlideDraft, "id">, value: string) => {
    setHomeSlides((current) => current.map((slide) => slide.id === id ? { ...slide, [field]: value } : slide));
  };

  const uploadHomeSlideImage = async (id: string, file: File | undefined) => {    if (!file || !canUsePremiumPlus) return;
    setSlideUploading(id);
    try {
      const imageUrl = await uploadImage(file, "gallery");
      updateHomeSlide(id, "imageUrl", imageUrl);
      toast.success("Slide image uploaded. Save the slider to publish it.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Slide image upload failed.");
    } finally {
      setSlideUploading(null);
      const input = slideFileRefs.current[id];
      if (input) input.value = "";
    }
  };

  const moveHomeSlide = (index: number, offset: -1 | 1) => {
    setHomeSlides((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const uploadHero = async (file: File | undefined) => {
    if (!file) return;
    setHeroUploading(true);
    try {
      const url = await uploadImage(file, "logo");
      const next = { ...hero, imageUrl: url };
      setHero(next);
      await saveHero(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setHeroUploading(false);
      if (heroFileRef.current) heroFileRef.current.value = "";
    }
  };

  const uploadPortfolioImage = async (file: File | undefined) => {
    if (!file || !portfolioDraft) return;
    setPortfolioUploading(true);
    try {
      const url = await uploadImage(file, "product");
      setPortfolioDraft((current) =>
        current ? { ...current, imageUrl: url } : current,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setPortfolioUploading(false);
      if (portfolioFileRef.current) portfolioFileRef.current.value = "";
    }
  };

  const uploadTestimonialImage = async (file: File | undefined) => {
    if (!file) return;
    setTestimonialUploading(true);
    try {
      const url = await uploadImage(file, "product");
      setTestimonialDraft((current) => (current ? { ...current, imageUrl: url } : current));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setTestimonialUploading(false);
      if (testimonialFileRef.current) testimonialFileRef.current.value = "";
    }
  };

  const submitTestimonial = async () => {
    if (!testimonialDraft) return;
    try {
      await save.mutateAsync({
        kind: "testimonial",
        id: testimonialDraft.id,
        authorName: testimonialDraft.authorName,
        authorRole: testimonialDraft.authorRole,
        quote: testimonialDraft.quote,
        rating: testimonialDraft.rating,
        imageUrl: testimonialDraft.imageUrl,
        published: testimonialDraft.published,
        sortOrder: testimonialDraft.sortOrder,
      });
      toast.success("Testimonial saved.");
      setTestimonialDraft(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    }
  };

  const submitPortfolio = async () => {
    if (!portfolioDraft) return;
    try {
      await save.mutateAsync({
        kind: "portfolio",
        id: portfolioDraft.id,
        title: portfolioDraft.title,
        description: portfolioDraft.description,        imageUrl: portfolioDraft.imageUrl,
        linkUrl: portfolioDraft.linkUrl,
        sortOrder: portfolioDraft.sortOrder,
      });
      toast.success("Work saved.");
      setPortfolioDraft(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    }
  };

  const deleteItem = async (kind: "testimonial" | "portfolio", id: string) => {
    try {
      await remove.mutateAsync({ kind, id });
      toast.success("Removed.");
      setConfirming(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete.");
    }
  };

  if ((loadingBusiness && !businessData) || (list.isFetching && !list.data)) {
    return (
      <div className={styles.page}>
        <Skeleton className={styles.skeletonTitle} />
        <Skeleton className={styles.skeletonBlock} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Presence — Oni247</title>
      </Helmet>

      <div>
        <h1 className={styles.title}>Presence</h1>
        <p className={styles.subtitle}>
          The parts that make your page look like a business rather than a
          list: an opening statement, proof from customers, and work you have
          done.
        </p>
      </div>

      {!canEdit && (
        <p className={styles.notice}>
          These sections are part of Premium. Anything already added stays on
          your page and can still be removed.{" "}
          <Link href="/dashboard/plan" className={styles.inlineLink}>
            See Premium
          </Link>
        </p>
      )}

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Hero</h2>

        <div className={styles.imageField}>
          <div className={styles.heroPreview}>
            {hero.imageUrl ? (
              <img src={hero.imageUrl} alt="" className={styles.heroImage} />
            ) : (
              <ImageOff size={20} className={styles.icon} />
            )}
          </div>
          <div className={styles.imageActions}>
            <input
              ref={heroFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={styles.fileInput}
              onChange={(event) => {
                void uploadHero(event.target.files?.[0]);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!canEdit || heroUploading}
              onClick={() => heroFileRef.current?.click()}
            >
              {heroUploading ? <Spinner size="sm" /> : <Upload size={15} />}
              {hero.imageUrl ? "Replace image" : "Upload image"}
            </Button>
            {hero.imageUrl && (
              <Button
                variant="ghost"
                size="sm"
                disabled={!canEdit}
                onClick={() => {
                  const next = { ...hero, imageUrl: null };
                  setHero(next);
                  void saveHero(next);
                }}
              >
                Remove
              </Button>
            )}
            <span className={styles.hint}>              A wide photo of your shop or work. PNG, JPG or WebP, up to 3 MB.
            </span>
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Headline</span>
          <Input
            value={hero.headline}
            disabled={!canEdit}
            onChange={(event) =>
              setHero({ ...hero, headline: event.target.value })
            }
            placeholder="Same-day phone repairs in Ikeja"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Supporting line</span>
          <Textarea
            value={hero.subtext}
            disabled={!canEdit}
            onChange={(event) =>
              setHero({ ...hero, subtext: event.target.value })
            }
            rows={2}
            placeholder="Walk in with a cracked screen, walk out the same afternoon."
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Button text</span>
          <Input
            value={hero.ctaLabel}
            disabled={!canEdit}
            onChange={(event) =>
              setHero({ ...hero, ctaLabel: event.target.value })
            }
            placeholder="Book a repair"
            className={styles.shortInput}
          />
          <span className={styles.hint}>
            Opens WhatsApp. Leave blank to use the default button.
          </span>
        </label>

        <div className={styles.formActions}>
          <Button
            disabled={!canEdit || saveBusiness.isPending}
            onClick={() => {
              void saveHero();
            }}
          >
            {saveBusiness.isPending ? <Spinner size="sm" /> : null}
            Save hero
          </Button>
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <div>
            <h2 className={styles.groupTitle}>Homepage slider & video</h2>
            <p className={styles.hint}>Add up to five slides, each with its own button action, plus a YouTube link or uploaded MP4/WebM video.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!canUsePremiumPlus || homeSlides.length >= 5}
            onClick={() => setHomeSlides((current) => [...current, { id: `slide-${Date.now()}`, imageUrl: "", headline: "", text: "", ctaLabel: "", ctaUrl: "" }])}
          >
            <Plus size={15} /> Add slide
          </Button>
        </div>

        {!canUsePremiumPlus && (
          <p className={styles.notice}>
            The homepage slider and video section are Premium Plus features. Your current content stays saved. <Link href="/dashboard/plan" className={styles.inlineLink}>View plans</Link>
          </p>
        )}

        {homeSlides.map((slide, index) => (
          <article className={styles.draft} key={slide.id}>
            <div className={styles.formHead}>
              <h3 className={styles.formTitle}>Slide {index + 1}</h3>
              <div className={styles.rowActions}>
                <Button variant="ghost" size="icon-sm" disabled={!canUsePremiumPlus || index === 0} aria-label={`Move slide ${index + 1} up`} onClick={() => moveHomeSlide(index, -1)}><ArrowUp size={16} /></Button>
                <Button variant="ghost" size="icon-sm" disabled={!canUsePremiumPlus || index === homeSlides.length - 1} aria-label={`Move slide ${index + 1} down`} onClick={() => moveHomeSlide(index, 1)}><ArrowDown size={16} /></Button>
                <Button variant="ghost" size="icon-sm" disabled={!canUsePremiumPlus} aria-label={`Remove slide ${index + 1}`} onClick={() => setHomeSlides((current) => current.filter((item) => item.id !== slide.id))}><Trash2 size={16} /></Button>
              </div>
            </div>
            <div className={styles.imageField}>
              <div className={styles.heroPreview}>
                {slide.imageUrl ? <img src={slide.imageUrl} alt="" className={styles.heroImage} /> : <ImageOff size={20} className={styles.icon} />}
              </div>
              <div className={styles.imageActions}>
                <input ref={(node) => { slideFileRefs.current[slide.id] = node; }} type="file" accept="image/png,image/jpeg,image/webp" className={styles.fileInput} disabled={!canUsePremiumPlus} onChange={(event) => { void uploadHomeSlideImage(slide.id, event.target.files?.[0]); }} />
                <Button variant="outline" size="sm" disabled={!canUsePremiumPlus || slideUploading === slide.id} onClick={() => slideFileRefs.current[slide.id]?.click()}>
                  {slideUploading === slide.id ? <Spinner size="sm" /> : <Upload size={15} />}{slide.imageUrl ? "Replace image" : "Upload image"}
                </Button>                <span className={styles.hint}>PNG, JPG or WebP, up to 3 MB.</span>
              </div>
            </div>
            <label className={styles.field}><span className={styles.label}>Headline</span><Input value={slide.headline} disabled={!canUsePremiumPlus} onChange={(event) => updateHomeSlide(slide.id, "headline", event.target.value)} placeholder="A headline for this slide" /></label>
            <label className={styles.field}><span className={styles.label}>Supporting text</span><Textarea value={slide.text} disabled={!canUsePremiumPlus} onChange={(event) => updateHomeSlide(slide.id, "text", event.target.value)} rows={2} placeholder="Short supporting message" /></label>
            <label className={styles.field}><span className={styles.label}>Image URL (optional — paste from Media Library)</span><Input value={slide.imageUrl} disabled={!canUsePremiumPlus} onChange={event=>updateHomeSlide(slide.id,"imageUrl",event.target.value)} placeholder="https://…"/></label>
            <div className={styles.twoUp}>
              <label className={styles.field}><span className={styles.label}>Button text</span><Input value={slide.ctaLabel} disabled={!canUsePremiumPlus} onChange={(event) => updateHomeSlide(slide.id, "ctaLabel", event.target.value)} placeholder="Learn more" /></label>
              <label className={styles.field}><span className={styles.label}>Button link</span><Input value={slide.ctaUrl} disabled={!canUsePremiumPlus} onChange={(event) => updateHomeSlide(slide.id, "ctaUrl", event.target.value)} placeholder="https://example.com or /contact" /></label>
            </div>
            <label className={styles.field}><span className={styles.label}>Set a quick action for this slide</span><select disabled={!canUsePremiumPlus} defaultValue="" onChange={event=>{const phone=(business?.whatsappNumber??business?.phone??"").replace(/\D/g,"");const destination:Record<string,string>={products:"#catalogue",services:"#services",contact:"#contact",events:"#events",whatsapp:phone?`https://wa.me/${phone}`:"",call:business?.phone?`tel:${business.phone.replace(/\s/g,"")}`:""};if(destination[event.target.value]!==undefined)updateHomeSlide(slide.id,"ctaUrl",destination[event.target.value]);}}><option value="">Choose a preset (or enter a custom link above)</option><option value="products">View products</option><option value="services">View services</option><option value="contact">Contact us</option><option value="events">Upcoming events</option><option value="whatsapp">WhatsApp</option><option value="call">Call business</option></select></label>
          </article>
        ))}

        <label className={styles.field}>
          <span className={styles.label}>YouTube video URL</span>
          <Input value={homepageVideoUrl} disabled={!canUsePremiumPlus} onChange={(event) => { setHomepageVideoUrl(event.target.value); if(event.target.value) setHomepageVideoFileUrl(""); }} placeholder="https://www.youtube.com/watch?v=..." />
          <span className={styles.hint}>Paste a YouTube link. Video files cannot be uploaded, so YouTube is the way to show a video.</span>
        </label>
        {homepageVideoFileUrl && (
          <div className={styles.imageActions}>
            <span className={styles.hint}>An older uploaded video is still in use.</span>
            <Button variant="ghost" size="sm" onClick={() => setHomepageVideoFileUrl("")}>Remove it</Button>
          </div>
        )}
        <div className={styles.twoUp}>
          <label className={styles.field}><span className={styles.label}>Image slider placement</span><select value={homepageSliderPlacement} disabled={!canUsePremiumPlus} onChange={e=>setHomepageSliderPlacement(e.target.value as "hero"|"section")}><option value="hero">Hero area (top of homepage)</option><option value="section">Below hero as a section</option></select></label>
          <label className={styles.field}><span className={styles.label}>Video placement</span><select value={homepageVideoPlacement} disabled={!canUsePremiumPlus} onChange={e=>setHomepageVideoPlacement(e.target.value as "hero"|"section")}><option value="section">Homepage video section</option><option value="hero">Hero area</option></select></label>
        </div>
        <div className={styles.twoUp}><label className={styles.field}><span className={styles.label}>Video section heading</span><Input value={homepageVideoTitle} disabled={!canUsePremiumPlus} onChange={e=>setHomepageVideoTitle(e.target.value)} placeholder="Watch our video"/></label><label className={styles.field}><span className={styles.label}>Slider auto-advance (seconds)</span><select value={homepageSliderInterval} disabled={!canUsePremiumPlus} onChange={e=>setHomepageSliderInterval(Number(e.target.value))}><option value={3}>3 seconds</option><option value={5}>5 seconds</option><option value={7}>7 seconds</option><option value={10}>10 seconds</option></select></label></div>
        <label className={styles.field}><span className={styles.label}>Video description (optional)</span><Textarea rows={2} value={homepageVideoDescription} disabled={!canUsePremiumPlus} onChange={e=>setHomepageVideoDescription(e.target.value)} placeholder="A short introduction to our business"/></label>
        <div className={styles.formActions}>
          <Button disabled={!canUsePremiumPlus || saveBusiness.isPending} onClick={() => void saveHomeMedia()}>{saveBusiness.isPending ? <Spinner size="sm" /> : null}Save slider & video</Button>
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2 className={styles.groupTitle}>Testimonials</h2>
          {!testimonialDraft && (
            <Button
              variant="outline"
              size="sm"
              disabled={!canEdit}
              onClick={() =>
                setTestimonialDraft({
                  id: null,
                  authorName: "",
                  authorRole: "",
                  quote: "",
                  rating: 5,
                  imageUrl: null,
                  published: true,
                  sortOrder: testimonials.length,
                })
              }
            >
              <Plus size={15} />
              Add
            </Button>
          )}
        </div>

        {testimonialDraft && (
          <div className={styles.draft}>
            <div className={styles.formHead}>
              <h3 className={styles.formTitle}>
                {testimonialDraft.id ? "Edit testimonial" : "New testimonial"}
              </h3>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setTestimonialDraft(null)}
                aria-label="Cancel"
              >
                <X size={16} />
              </Button>
            </div>

            <Textarea
              value={testimonialDraft.quote}
              onChange={(event) =>
                setTestimonialDraft({
                  ...testimonialDraft,
                  quote: event.target.value,
                })
              }
              rows={3}
              placeholder="What the customer said, in their words."
              aria-label="Testimonial"
            />

            <div className={styles.twoUp}>
              <Input
                value={testimonialDraft.authorName}
                onChange={(event) =>
                  setTestimonialDraft({
                    ...testimonialDraft,
                    authorName: event.target.value,
                  })                }
                placeholder="Customer name"
                aria-label="Customer name"
              />
              <Input
                value={testimonialDraft.authorRole}
                onChange={(event) =>
                  setTestimonialDraft({
                    ...testimonialDraft,
                    authorRole: event.target.value,
                  })
                }
                placeholder="Where they are from (optional)"
                aria-label="Customer role"
              />
            </div>

            <div className={styles.ratingRow}>
              <span className={styles.label}>Photo (optional)</span>
              <input
                ref={testimonialFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(event) => void uploadTestimonialImage(event.target.files?.[0])}
              />
              <div className={styles.imageActions}>
                {testimonialDraft.imageUrl && (
                  <img src={testimonialDraft.imageUrl} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={testimonialUploading}
                  onClick={() => testimonialFileRef.current?.click()}
                >
                  {testimonialUploading ? <Spinner size="sm" /> : <Upload size={14} />}
                  {testimonialDraft.imageUrl ? "Replace photo" : "Add photo"}
                </Button>
                {testimonialDraft.imageUrl && (
                  <Button variant="ghost" size="sm" onClick={() => setTestimonialDraft({ ...testimonialDraft, imageUrl: null })}>
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className={styles.ratingRow}>
              <span className={styles.label}>Rating</span>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={styles.starButton}
                    aria-label={`${value} stars`}
                    onClick={() =>
                      setTestimonialDraft({
                        ...testimonialDraft,
                        rating:
                          testimonialDraft.rating === value ? null : value,
                      })
                    }
                  >
                    <Star
                      size={18}
                      className={
                        testimonialDraft.rating !== null &&
                        value <= testimonialDraft.rating
                          ? styles.starOn
                          : styles.starOff
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.switchRow}>
              <Switch
                id="published"
                checked={testimonialDraft.published}
                onCheckedChange={(checked) =>
                  setTestimonialDraft({
                    ...testimonialDraft,
                    published: checked,
                  })
                }
              />
              <label htmlFor="published" className={styles.label}>
                Show on my page
              </label>
            </div>

            <div className={styles.formActions}>
              <Button
                disabled={
                  save.isPending ||
                  testimonialDraft.authorName.trim().length === 0 ||
                  testimonialDraft.quote.trim().length < 4                }
                onClick={() => {
                  void submitTestimonial();
                }}
              >
                {save.isPending ? <Spinner size="sm" /> : null}
                Save
              </Button>
              <Button
                variant="ghost"
                onClick={() => setTestimonialDraft(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {testimonials.length === 0 && !testimonialDraft ? (
          <p className={styles.hint}>
            Nothing yet. One honest line from a real customer does more than a
            page of description.
          </p>
        ) : (
          <ul className={styles.list}>
            {testimonials.map((item) => (
              <li key={item.id} className={styles.row}>
                <div className={styles.rowText}>
                  <span className={styles.quote}>{item.quote}</span>
                  <span className={styles.rowMeta}>
                    {item.authorName}
                    {item.authorRole ? ` · ${item.authorRole}` : ""}
                    {item.rating ? ` · ${item.rating}/5` : ""}
                    {item.published ? "" : " · hidden"}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={!canEdit}
                    aria-label="Edit testimonial"
                    onClick={() =>
                      setTestimonialDraft({
                        id: item.id,
                        authorName: item.authorName,
                        authorRole: item.authorRole ?? "",
                        quote: item.quote,
                        rating: item.rating,
                        imageUrl: item.imageUrl ?? null,
                        published: item.published,
                        sortOrder: item.sortOrder,
                      })
                    }
                  >
                    <Pencil size={14} />
                  </Button>
                  {confirming === item.id ? (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => {
                          void deleteItem("testimonial", item.id);
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirming(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete testimonial"
                      onClick={() => setConfirming(item.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <div>
            <h2 className={styles.groupTitle}>Portfolio</h2>
            <p className={styles.hint}>Show customers examples of completed work.</p>
          </div>
        </div>

        {portfolioDraft && (
          <div className={styles.draft}>
            <div className={styles.imageField}>
              <div className={styles.heroPreview}>
                {portfolioDraft.imageUrl ? <img src={portfolioDraft.imageUrl} alt="" className={styles.heroImage}/> : <ImageOff size={20} className={styles.icon}/>}
              </div>
              <div className={styles.imageActions}>
                <input ref={portfolioFileRef} type="file" accept="image/png,image/jpeg,image/webp" className={styles.fileInput} onChange={(e)=>void uploadPortfolioImage(e.target.files?.[0])}/>
                <Button variant="outline" size="sm" disabled={!canEdit || portfolioUploading} onClick={()=>portfolioFileRef.current?.click()}>{portfolioUploading ? <Spinner size="sm"/> : <Upload size={15}/>} Upload image</Button>
                {portfolioDraft.imageUrl && <Button variant="ghost" size="sm" onClick={()=>setPortfolioDraft({...portfolioDraft,imageUrl:null})}>Remove</Button>}
              </div>
            </div>
            <Input value={portfolioDraft.title} onChange={(e)=>setPortfolioDraft({...portfolioDraft,title:e.target.value})} placeholder="Project title" aria-label="Project title"/>
            <Textarea value={portfolioDraft.description} onChange={(e)=>setPortfolioDraft({...portfolioDraft,description:e.target.value})} rows={2} placeholder="Description (optional)" aria-label="Description"/>
            <Input value={portfolioDraft.linkUrl} onChange={(e)=>setPortfolioDraft({...portfolioDraft,linkUrl:e.target.value})} placeholder="Project link (optional)" aria-label="Project link"/>
            <div className={styles.formActions}>
              <Button disabled={!canEdit || save.isPending || portfolioUploading || !portfolioDraft.title.trim()} onClick={()=>void submitPortfolio()}>{save.isPending ? <Spinner size="sm"/> : null} Save work</Button>
              <Button variant="ghost" onClick={()=>setPortfolioDraft(null)}>Cancel</Button>
            </div>
          </div>
        )}
        {portfolio.length === 0 && !portfolioDraft ? <p className={styles.hint}>No portfolio items yet. Add examples of completed work to build customer confidence.</p> : (
          <ul className={styles.list}>
            {portfolio.map((item)=>(
              <li key={item.id} className={styles.row}>
                <div className={styles.thumb}>{item.imageUrl ? <img src={item.imageUrl} alt="" className={styles.thumbImage}/> : <ImageOff size={15} className={styles.icon}/>}</div>
                <div className={styles.rowText}><span className={styles.rowName}>{item.title}</span>{item.description && <span className={styles.rowMeta}>{item.description}</span>}</div>
                <div className={styles.rowActions}>
                  <Button variant="outline" size="icon-sm" disabled={!canEdit} aria-label="Edit work" onClick={()=>setPortfolioDraft({id:item.id,title:item.title,description:item.description ?? "",imageUrl:item.imageUrl,linkUrl:item.linkUrl ?? "",sortOrder:item.sortOrder})}><Pencil size={14}/></Button>
                  {confirming === item.id ? <><Button variant="destructive" size="sm" disabled={remove.isPending} onClick={()=>void deleteItem("portfolio",item.id)}>Delete</Button><Button variant="ghost" size="sm" onClick={()=>setConfirming(null)}>Cancel</Button></> : <Button variant="ghost" size="icon-sm" aria-label="Delete work" disabled={!canEdit} onClick={()=>setConfirming(item.id)}><Trash2 size={14}/></Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
export default PresencePage;
