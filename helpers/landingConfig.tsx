/**
 * The Oni247 landing page's content and look. The admin edits it (Admin → Landing page) and the home page reads it.
 * Pure and shared: the server uses `mergeLanding` to clean whatever is saved, the page uses it to fill gaps.
 */
export const LANDING_KEY = "landing";

export const ICON_NAMES = ["Globe2", "Package", "MessageCircle", "Share2", "BarChart3", "Search", "ShoppingBag", "Store", "Sparkles", "Truck", "Smartphone", "CreditCard", "Users", "Mail", "Calendar", "Image", "ShieldCheck", "Zap"] as const;
export type IconName = (typeof ICON_NAMES)[number];

export type LandingItem = { icon: IconName; title: string; text: string };
export type LandingStep = { title: string; text: string };

export type LandingTheme = {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  mutedTextColor: string;
  cardBackground: string;
  borderColor: string;
  buttonBackground: string;
  buttonTextColor: string;
  cardRadius: string;
  fontFamily: string;
  displayFontFamily: string;
  headingWeight: string;
};

export type Landing = {
  /** False until the admin changes the look, so the built-in design stays exactly as it is. */
  customTheme: boolean;
  theme: LandingTheme;
  brand: { name: string; tagline: string };
  nav: { features: string; how: string; pricing: string; login: string };
  hero: { enabled: boolean; eyebrow: string; headline: string; sub: string; primaryCta: string; secondaryCta: string; trialNote: string; showPreview: boolean };
  trust: { enabled: boolean; text: string; items: string[] };
  features: { enabled: boolean; kicker: string; title: string; intro: string; items: LandingItem[] };
  how: { enabled: boolean; kicker: string; title: string; text: string; steps: LandingStep[] };
  audience: { enabled: boolean; kicker: string; title: string; items: LandingItem[] };
  pricing: { enabled: boolean; kicker: string; title: string; text: string; showFree: boolean };
  cta: { enabled: boolean; kicker: string; title: string; text: string; button: string; checks: string[] };
  footer: { tagline: string };
  seo: { title: string; description: string };
};

export const DEFAULT_LANDING: Landing = {
  customTheme: false,
  theme: {
    primaryColor: "#0e5c3f",
    accentColor: "#d97706",
    backgroundColor: "#f7f4ec",
    textColor: "#17201a",
    mutedTextColor: "#626b64",
    cardBackground: "#fffdf7",
    borderColor: "#d9d6cb",
    buttonBackground: "#0e5c3f",
    buttonTextColor: "#ffffff",
    cardRadius: "10px",
    fontFamily: "Inter Tight, sans-serif",
    displayFontFamily: "Bricolage Grotesque, sans-serif",
    headingWeight: "800",
  },
  brand: { name: "Oni247", tagline: "A simple online home for your business." },
  nav: { features: "Features", how: "How it works", pricing: "Pricing", login: "Log in" },
  hero: {
    enabled: true,
    eyebrow: "Built for small businesses",
    headline: "Your business deserves more than a WhatsApp status.",
    sub: "Oni247 gives you a professional online home for your products, services and customers — without the complexity of building and maintaining a full website.",
    primaryCta: "Create your free page",
    secondaryCta: "See how it works",
    trialNote: "Start free. New businesses get 7 days of Premium features.",
    showPreview: true,
  },
  trust: { enabled: true, text: "One simple place for your business online", items: ["Storefront", "WhatsApp", "Mobile ready", "Shareable link"] },
  features: {
    enabled: true,
    kicker: "Everything you need to start",
    title: "From first impression to first order.",
    intro: "Oni247 brings the practical pieces of an online business presence together in one lightweight workspace.",
    items: [
      { icon: "Globe2", title: "Professional storefront", text: "Give customers a clean page with your business identity, products, services, contact details and brand." },
      { icon: "Package", title: "Products & services", text: "Organise your catalogue with prices, descriptions, categories, images and availability." },
      { icon: "MessageCircle", title: "Orders & enquiries", text: "Let customers ask questions or send orders, with WhatsApp built into the buying journey." },
      { icon: "Share2", title: "Share everywhere", text: "Share your business page, products and collections through the channels your customers already use." },
      { icon: "BarChart3", title: "Simple performance", text: "Premium gives you straightforward revenue, cost, gross profit and product performance reporting." },
      { icon: "Search", title: "Ready to be found", text: "Basic SEO, public pages and a sitemap help search engines discover your online presence." },
    ],
  },
  how: {
    enabled: true,
    kicker: "Simple by design",
    title: "Go from idea to a live business page in minutes.",
    text: "Whether you sell fashion, food, electronics, beauty services, repairs or professional services, the setup stays focused on what your customers actually need.",
    steps: [
      { title: "Create your account", text: "Start with your business name and category." },
      { title: "Add your catalogue", text: "Products and services, prices, photos and contact details." },
      { title: "Publish your page", text: "Get a shareable storefront designed for phones and social sharing." },
      { title: "Share and sell", text: "Send your link to customers and receive orders or enquiries." },
    ],
  },
  audience: {
    enabled: true,
    kicker: "Made for real businesses",
    title: "One platform, many kinds of business.",
    items: [
      { icon: "ShoppingBag", title: "Retail & fashion", text: "Show products and take orders." },
      { icon: "Store", title: "Shops & supermarkets", text: "Publish your catalogue and categories." },
      { icon: "Sparkles", title: "Beauty & lifestyle", text: "Present services and enquiries." },
      { icon: "Truck", title: "Local services", text: "Turn your service list into a professional page." },
    ],
  },
  pricing: {
    enabled: true,
    kicker: "Start without a heavy commitment",
    title: "Free to get started. Premium when you need more.",
    text: "Create your page, build your catalogue and start sharing. New businesses receive a one-time free trial automatically. Prices below come straight from the plans you set in Admin.",
    showFree: true,
  },
  cta: {
    enabled: true,
    kicker: "Your business is already online somewhere.",
    title: "Give it a home.",
    text: "Build your Oni247 page and give customers one clear place to find you, browse what you offer and contact you.",
    button: "Create your free page",
    checks: ["No website coding", "Mobile friendly", "Start free"],
  },
  footer: { tagline: "A simple online home for your business." },
  seo: { title: "Oni247 — Your business, online and ready to grow", description: "Create a professional online presence for your business. Share products and services, receive enquiries and orders, and track simple business performance with Oni247." },
};

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, fallback: string, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : fallback);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);
const hex = (v: unknown, fallback: string): string => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback);
const icon = (v: unknown, fallback: IconName): IconName => ((ICON_NAMES as readonly string[]).includes(v as string) ? (v as IconName) : fallback);
const list = <T,>(v: unknown, fallback: T[], max: number, make: (x: Record<string, unknown>, i: number) => T): T[] => {
  if (!Array.isArray(v)) return fallback;
  return v.filter(isObj).slice(0, max).map(make);
};
const strings = (v: unknown, fallback: string[], max: number): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max).map((x) => x.trim().slice(0, 80)) : fallback);

/** Cleans anything (saved JSON, a form) into a complete, safe Landing. Missing parts fall back to the defaults. */
export const mergeLanding = (input: unknown): Landing => {
  const d = DEFAULT_LANDING;
  const s = isObj(input) ? input : {};
  const th = isObj(s.theme) ? s.theme : {};
  const get = (k: string) => (isObj(s[k]) ? (s[k] as Record<string, unknown>) : {});
  const brand = get("brand");
  const nav = get("nav");
  const hero = get("hero");
  const trust = get("trust");
  const features = get("features");
  const how = get("how");
  const audience = get("audience");
  const pricing = get("pricing");
  const cta = get("cta");
  const footer = get("footer");
  const seo = get("seo");
  const item = (fallbackIcon: IconName) => (x: Record<string, unknown>): LandingItem => ({ icon: icon(x.icon, fallbackIcon), title: str(x.title, "", 60), text: str(x.text, "", 200) });
  return {
    customTheme: bool(s.customTheme, d.customTheme),
    theme: {
      primaryColor: hex(th.primaryColor, d.theme.primaryColor),
      accentColor: hex(th.accentColor, d.theme.accentColor),
      backgroundColor: hex(th.backgroundColor, d.theme.backgroundColor),
      textColor: hex(th.textColor, d.theme.textColor),
      mutedTextColor: hex(th.mutedTextColor, d.theme.mutedTextColor),
      cardBackground: hex(th.cardBackground, d.theme.cardBackground),
      borderColor: hex(th.borderColor, d.theme.borderColor),
      buttonBackground: hex(th.buttonBackground, d.theme.buttonBackground),
      buttonTextColor: hex(th.buttonTextColor, d.theme.buttonTextColor),
      cardRadius: ["0px", "6px", "10px", "16px", "24px"].includes(String(th.cardRadius)) ? String(th.cardRadius) : d.theme.cardRadius,
      fontFamily: str(th.fontFamily, d.theme.fontFamily, 80),
      displayFontFamily: str(th.displayFontFamily, d.theme.displayFontFamily, 80),
      headingWeight: ["500", "600", "700", "800"].includes(String(th.headingWeight)) ? String(th.headingWeight) : d.theme.headingWeight,
    },
    brand: { name: str(brand.name, d.brand.name, 40) || d.brand.name, tagline: str(brand.tagline, d.brand.tagline, 100) },
    nav: { features: str(nav.features, d.nav.features, 24), how: str(nav.how, d.nav.how, 24), pricing: str(nav.pricing, d.nav.pricing, 24), login: str(nav.login, d.nav.login, 24) },
    hero: {
      enabled: bool(hero.enabled, d.hero.enabled),
      eyebrow: str(hero.eyebrow, d.hero.eyebrow, 60),
      headline: str(hero.headline, d.hero.headline, 140),
      sub: str(hero.sub, d.hero.sub, 320),
      primaryCta: str(hero.primaryCta, d.hero.primaryCta, 40),
      secondaryCta: str(hero.secondaryCta, d.hero.secondaryCta, 40),
      trialNote: str(hero.trialNote, d.hero.trialNote, 120),
      showPreview: bool(hero.showPreview, d.hero.showPreview),
    },
    trust: { enabled: bool(trust.enabled, d.trust.enabled), text: str(trust.text, d.trust.text, 80), items: strings(trust.items, d.trust.items, 6) },
    features: { enabled: bool(features.enabled, d.features.enabled), kicker: str(features.kicker, d.features.kicker, 60), title: str(features.title, d.features.title, 120), intro: str(features.intro, d.features.intro, 240), items: list(features.items, d.features.items, 12, item("Globe2")) },
    how: {
      enabled: bool(how.enabled, d.how.enabled),
      kicker: str(how.kicker, d.how.kicker, 60),
      title: str(how.title, d.how.title, 120),
      text: str(how.text, d.how.text, 300),
      steps: list(how.steps, d.how.steps, 8, (x) => ({ title: str(x.title, "", 60), text: str(x.text, "", 160) })),
    },
    audience: { enabled: bool(audience.enabled, d.audience.enabled), kicker: str(audience.kicker, d.audience.kicker, 60), title: str(audience.title, d.audience.title, 120), items: list(audience.items, d.audience.items, 8, item("Store")) },
    pricing: { enabled: bool(pricing.enabled, d.pricing.enabled), kicker: str(pricing.kicker, d.pricing.kicker, 60), title: str(pricing.title, d.pricing.title, 120), text: str(pricing.text, d.pricing.text, 300), showFree: bool(pricing.showFree, d.pricing.showFree) },
    cta: { enabled: bool(cta.enabled, d.cta.enabled), kicker: str(cta.kicker, d.cta.kicker, 80), title: str(cta.title, d.cta.title, 100), text: str(cta.text, d.cta.text, 240), button: str(cta.button, d.cta.button, 40), checks: strings(cta.checks, d.cta.checks, 5) },
    footer: { tagline: str(footer.tagline, d.footer.tagline, 100) },
    seo: { title: str(seo.title, d.seo.title, 70), description: str(seo.description, d.seo.description, 200) },
  };
};
  206