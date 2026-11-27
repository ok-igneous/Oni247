import type { CSSProperties } from "react";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, BarChart3, Calendar, Check, CreditCard, Globe2, Image, Mail, MessageCircle, Package, Search, Share2,
  ShieldCheck, ShoppingBag, Smartphone, Sparkles, Store, Truck, Users, Zap, type LucideIcon,
} from "lucide-react";
import { Button } from "../components/Button";
import { useAuth } from "../helpers/useAuth";
import { DEFAULT_LANDING, type IconName } from "../helpers/landingConfig";
import { storeThemeEngine } from "../helpers/storeThemeEngine";
import { formatMoney } from "../helpers/formatMoney";
import { getLanding, type OutputType as LandingData } from "../endpoints/landing_GET.schema";
import styles from "./_index.module.css";

const ICONS: Record<IconName, LucideIcon> = { Globe2, Package, MessageCircle, Share2, BarChart3, Search, ShoppingBag, Store, Sparkles, Truck, Smartphone, CreditCard, Users, Mail, Calendar, Image, ShieldCheck, Zap };
const trustIcons = [Store, MessageCircle, Smartphone, Globe2, Zap, ShieldCheck];

const FALLBACK: LandingData = { landing: DEFAULT_LANDING, plans: [] };

function HomePageContent() {
  const { authState } = useAuth();
  const router = useRouter();
  const [params] = useSearchParams();
  const preview = params.get("preview") === "1";
  const { data = FALLBACK } = useQuery({ queryKey: ["landing"], queryFn: () => getLanding(), retry: false, staleTime: 30_000, placeholderData: FALLBACK });
  const { landing: L, plans } = data;

  useEffect(() => {
    if (authState.type === "authenticated" && !preview) router.replace("/dashboard");
  }, [authState.type, preview, router]);

  if (authState.type === "authenticated" && !preview) return null;

  const themeStyle = L.customTheme ? (storeThemeEngine("clean", L.theme).style as CSSProperties) : undefined;
  const paidPlans = plans.filter((p) => p.id !== "free");
  const shownPlans = L.pricing.showFree ? plans : paidPlans;

  return (
    <div className={styles.page} style={themeStyle}>
      

      <header className={styles.topBar}>
        <Link href="/" className={styles.brand}>{L.brand.name}</Link>
        <nav className={styles.topNav} aria-label="Main navigation">
          {L.features.enabled && <a href="#features">{L.nav.features}</a>}
          {L.how.enabled && <a href="#how-it-works">{L.nav.how}</a>}
          {L.pricing.enabled && <a href="#pricing">{L.nav.pricing}</a>}
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{L.nav.login}</Link>
          </Button>
        </nav>
      </header>

      <main>
        {L.hero.enabled && (
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              {L.hero.eyebrow && <div className={styles.eyebrow}><Sparkles size={15} /> {L.hero.eyebrow}</div>}
              <h1 className={styles.headline}>{L.hero.headline}</h1>
              <p className={styles.sub}>{L.hero.sub}</p>
              <div className={styles.actions}>
                <Button asChild size="lg">
                  <Link href="/register">{L.hero.primaryCta} <ArrowRight size={17} /></Link>
                </Button>
                {L.hero.secondaryCta && L.how.enabled && (
                  <Button asChild variant="outline" size="lg">
                    <a href="#how-it-works">{L.hero.secondaryCta}</a>
                  </Button>
                )}
              </div>
              {L.hero.trialNote && <p className={styles.trialNote}>{L.hero.trialNote}</p>}
            </div>

            {L.hero.showPreview && (
              <div className={styles.heroVisual} aria-label={`${L.brand.name} storefront preview`}>
                <div className={styles.browserBar}>
                  <span /><span /><span />
                  <div className={styles.address}>yourbusiness.oniduka.com</div>
                </div>
                <div className={styles.storePreview}>
                  <div className={styles.previewIdentity}>
                    <div className={styles.previewLogo}>Y</div>
                    <div>
                      <strong>Your Business</strong>
                      <small>Quality products. Personal service.</small>
                    </div>
                  </div>
                  <div className={styles.previewHero}>Everything your customers need, in one place.</div>
                  <div className={styles.previewGrid}>
                    <div><div className={styles.previewImage}><ShoppingBag size={24} /></div><strong>Featured item</strong><small>₦25,000</small></div>
                    <div><div className={styles.previewImage}><Store size={24} /></div><strong>Popular service</strong><small>From ₦10,000</small></div>
                  </div>
                  <div className={styles.previewCta}><MessageCircle size={15} /> Message on WhatsApp</div>
                </div>
              </div>
            )}
          </section>
        )}

        {L.trust.enabled && (
          <section className={styles.trustStrip}>
            <span>{L.trust.text}</span>
            {L.trust.items.map((t, i) => {
              const Icon = trustIcons[i % trustIcons.length];
              return <div key={`${t}-${i}`}><Icon size={17} /> {t}</div>;
            })}
          </section>
        )}

        {L.features.enabled && (
          <section className={styles.section} id="features">
            <div className={styles.sectionIntro}>
              <span className={styles.kicker}>{L.features.kicker}</span>
              <h2>{L.features.title}</h2>
              <p>{L.features.intro}</p>
            </div>
            <div className={styles.featureGrid}>
              {L.features.items.map((f, i) => {
                const Icon = ICONS[f.icon] ?? Globe2;
                return <article key={`${f.title}-${i}`} className={styles.featureCard}><div className={styles.icon}><Icon /></div><h3>{f.title}</h3><p>{f.text}</p></article>;
              })}
            </div>
          </section>
        )}

        {L.how.enabled && (
          <section className={styles.splitSection} id="how-it-works">
            <div>
              <span className={styles.kicker}>{L.how.kicker}</span>
              <h2>{L.how.title}</h2>
              <p>{L.how.text}</p>
            </div>
            <ol className={styles.steps}>
              {L.how.steps.map((s, i) => (
                <li key={`${s.title}-${i}`}><span>{String(i + 1).padStart(2, "0")}</span><div><strong>{s.title}</strong><p>{s.text}</p></div></li>
              ))}
            </ol>
          </section>
        )}

        {L.audience.enabled && (
          <section className={styles.audienceSection}>
            <div className={styles.sectionIntro}>
              <span className={styles.kicker}>{L.audience.kicker}</span>
              <h2>{L.audience.title}</h2>
            </div>
            <div className={styles.audienceGrid}>
              {L.audience.items.map((a, i) => {
                const Icon = ICONS[a.icon] ?? Store;
                return <div key={`${a.title}-${i}`}><Icon /><strong>{a.title}</strong><span>{a.text}</span></div>;
              })}
            </div>
          </section>
        )}

        {L.pricing.enabled && (
          <section className={styles.pricingSection} id="pricing">
            <div className={styles.pricingIntro}>
              <span className={styles.kicker}>{L.pricing.kicker}</span>
              <h2>{L.pricing.title}</h2>
              <p>{L.pricing.text}</p>
            </div>
            <div className={styles.planGrid}>
              {shownPlans.map((p) => (
                <article key={p.id} className={`${styles.planCard} ${p.highlighted ? styles.planCardOn : ""}`}>
                  <h3>{p.name}</h3>
                  <div className={styles.planPrice}><strong>{p.priceMonthlyNgn > 0 ? formatMoney(p.priceMonthlyNgn, "NGN") : "Free"}</strong>{p.priceMonthlyNgn > 0 && <span>per month</span>}</div>
                  {p.description && <p>{p.description}</p>}
                  <ul>
                    <li><Check size={14} /> {p.productLimit === null ? "Unlimited products" : `Up to ${p.productLimit} products`}</li>
                    {p.features.slice(0, 7).map((f) => <li key={f}><Check size={14} /> {f}</li>)}
                  </ul>
                  <Button asChild variant={p.highlighted ? "primary" : "outline"}><Link href="/register">Get started <ArrowRight size={16} /></Link></Button>
                </article>
              ))}
            </div>
          </section>
        )}

        {L.cta.enabled && (
          <section className={styles.finalCta}>
            <span className={styles.kicker}>{L.cta.kicker}</span>
            <h2>{L.cta.title}</h2>
            <p>{L.cta.text}</p>
            <Button asChild size="lg"><Link href="/register">{L.cta.button} <ArrowRight size={17} /></Link></Button>
            <div className={styles.checks}>{L.cta.checks.map((c) => <span key={c}><Check size={15} /> {c}</span>)}</div>
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <div><strong>{L.brand.name}</strong><span>{L.footer.tagline}</span></div>
        <div><Link href="/login">{L.nav.login}</Link><Link href="/register">Create a page</Link></div>
        <small>© {new Date().getFullYear()} {L.brand.name}</small>
      </footer>
    </div>
  );
};

export function HomePageNext() {
  return <Suspense fallback={<main style={{ minHeight: "100vh", padding: 32 }}>Loading Oni247…</main>}><HomePageContent /></Suspense>;
}

