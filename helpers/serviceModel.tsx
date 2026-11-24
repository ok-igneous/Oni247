import type { CheckoutMode } from "./paymentProviders";

/** One service as an owner saves it (inside businesses.content_settings.services). Pure, shared by dashboard, shop and server. */
export type ServiceItem = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: string;
  priceType: "fixed" | "starting" | "contact";
  duration: string;
  category: string;
  featured: boolean;
  published: boolean;
  cta: "request" | "whatsapp" | "call" | "enquire";
  /** What is included, one point per line. */
  includes: string[];
  /** How customers book: send a request only, or pay a deposit or the full price online. */
  checkoutMode: CheckoutMode;
  depositPercent: number;
  /** Where the service happens. */
  location: "business" | "customer" | "online";
  /** Ask the customer for a preferred date and time. */
  askSchedule: boolean;
  /** Cancellation or booking terms shown at checkout. */
  terms: string;
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const normalizeService = (raw: unknown): ServiceItem | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const x = raw as Record<string, unknown>;
  const pct = Number(x.depositPercent);
  return {
    id: typeof x.id === "string" && x.id ? x.id : "",
    name: str(x.name, 120) || "Service",
    description: str(x.description, 4000),
    imageUrl: typeof x.imageUrl === "string" && x.imageUrl ? x.imageUrl : null,
    price: str(x.price, 40),
    priceType: x.priceType === "fixed" || x.priceType === "contact" ? x.priceType : "starting",
    duration: str(x.duration, 60),
    category: str(x.category, 60),
    featured: x.featured === true,
    published: x.published !== false,
    cta: x.cta === "whatsapp" || x.cta === "call" || x.cta === "enquire" ? x.cta : "request",
    includes: Array.isArray(x.includes) ? x.includes.filter((l): l is string => typeof l === "string" && l.trim() !== "").map((l) => l.trim().slice(0, 140)).slice(0, 12) : [],
    checkoutMode: x.checkoutMode === "deposit" || x.checkoutMode === "full" ? x.checkoutMode : "enquiry",
    depositPercent: Number.isFinite(pct) ? Math.min(100, Math.max(1, Math.round(pct))) : 30,
    location: x.location === "customer" || x.location === "online" ? x.location : "business",
    askSchedule: x.askSchedule !== false,
    terms: str(x.terms, 800),
  };
};

export const readServices = (contentSettings: unknown): ServiceItem[] => {
  const raw = contentSettings && typeof contentSettings === "object" && !Array.isArray(contentSettings) ? (contentSettings as Record<string, unknown>).services : null;
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeService).filter((s): s is ServiceItem => s !== null && s.id !== "");
};
