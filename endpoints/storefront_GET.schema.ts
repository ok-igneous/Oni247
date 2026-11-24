import { z } from "zod";
import superjson from "superjson";
import type { StoreTheme } from "../helpers/schema";

export const schema = z.object({
  slug: z.string().min(1).max(120),
});

export type InputType = z.infer<typeof schema>;

export type StorefrontProduct = {
  id: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
  available: boolean;
  featured: boolean;
  unit?: string | null;
  variants?: Array<{ name: string; value: string; price: number | null }>;
  /** Units left. null = the shop does not track stock for this product. */
  stockQuantity?: number | null;
  /** Extra gallery images beyond imageUrl. */
  images?: string[];
  /** The "was" price shown struck through when it is above the current price. */
  compareAtPrice?: number | null;
  createdAt?: Date;
};

export type StorefrontCategory = {
  id: string;
  name: string;
  description: string | null;
};

export type StorefrontService = {
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
  /** Additive fields for the professional services engine. */
  includes?: string[];
  checkoutMode?: "enquiry" | "deposit" | "full";
  depositPercent?: number;
  location?: "business" | "customer" | "online";
  askSchedule?: boolean;
  terms?: string;
  /** True when the shop has a payment gateway switched on and this service has a payable price. */
  payOnline?: boolean;
  amountDue?: number;
  amountTotal?: number;
};

export type StorefrontTestimonial = {
  id: string;
  authorName: string;
  authorRole: string | null;
  quote: string;
  rating: number | null;
  /** Optional photo of the person (or the job) the testimonial is about. */
  imageUrl?: string | null;
};

export type StorefrontPortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
};

export type StorefrontBlogPost = {
  id: string;
  /** True when the summary was taken from the body because none was written. */
  autoExcerpt?: boolean;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  content: string;
  publishedAt: Date | null;
};

export type StorefrontEvent = { id: string; title: string; slug: string; description: string; coverImageUrl: string|null; startsAt: Date; endsAt: Date|null; venue: string|null; registrationEnabled: boolean; };

/** Delivery and payment options a customer can choose from. Bank details are not included. */
export type StorefrontCheckout = {
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  pickupNote: string;
  zones: Array<{ name: string; fee: number }>;
  freeDeliveryOver: number | null;
  deliveryNote: string;
  returnPolicy: string;
  paymentMethods: {
    cashOnDelivery: boolean;
    bankTransfer: boolean;
    payOnPickup: boolean;
    /** Pay by card, bank transfer or USSD through the shop's own payment gateway. */
    online?: boolean;
  };
};

export type OutputType = {
  business: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    heroHeadline: string | null;
    heroSubtext: string | null;
    heroImageUrl: string | null;
    heroCtaLabel: string | null;
    phone: string | null;
    whatsappNumber: string | null;
    email: string | null;
    address: string | null;
    openingHours: string | null;
    themeId: StoreTheme;
    currency: string;
    canUseProductLinks: boolean;
    canUseMultiPage: boolean;
    blogSettings?: import("../helpers/parseBlogSettings").BlogSettings;
    checkout?: StorefrontCheckout;
    appearanceSettings?: Record<string, unknown>;
    contentSettings?: Record<string, unknown>;
  };
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
  services: StorefrontService[];
  testimonials: StorefrontTestimonial[];
  portfolio: StorefrontPortfolioItem[];
  blogPosts: StorefrontBlogPost[];
  events: StorefrontEvent[];
};

export const getStorefront = async (
  query: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validated = schema.parse(query);
  const params = new URLSearchParams({ slug: validated.slug });
  const result = await fetch(`/_api/storefront?${params.toString()}`, {
    method: "GET",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
