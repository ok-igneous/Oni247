import { z } from "zod";
import superjson from "superjson";
import type { StoreTheme } from "../helpers/schema";

export const schema = z.object({
  slug: z.string().min(1).max(120),
});

export type InputType = z.infer<typeof schema>;
   10	
   11	export type StorefrontProduct = {
   12	  id: string;
   13	  categoryId: string | null;
   14	  name: string;
   15	  slug: string;
   16	  description: string | null;
   17	  price: number;
   18	  currency: string;
   19	  imageUrl: string | null;
   20	  available: boolean;
   21	  featured: boolean;
   22	  unit?: string | null;
   23	  variants?: Array<{ name: string; value: string; price: number | null }>;
   24	};
   25	
   26	export type StorefrontCategory = {
   27	  id: string;
   28	  name: string;
   29	  description: string | null;
   30	};
   31	
   32	export type StorefrontService = {
   33	  id: string;
   34	  name: string;
   35	  description: string;
   36	  imageUrl: string | null;
   37	  price: string;
   38	  priceType: "fixed" | "starting" | "contact";
   39	  duration: string;
   40	  category: string;
   41	  featured: boolean;
   42	  published: boolean;
   43	  cta: "request" | "whatsapp" | "call" | "enquire";
   44	};
   45	
   46	export type StorefrontTestimonial = {
   47	  id: string;
   48	  authorName: string;
   49	  authorRole: string | null;
   50	  quote: string;
   51	  rating: number | null;
   52	};
   53	
   54	export type StorefrontPortfolioItem = {
   55	  id: string;
   56	  title: string;
   57	  description: string | null;
   58	  imageUrl: string | null;
   59	  linkUrl: string | null;
   60	};
   61	
   62	export type StorefrontBlogPost = {
   63	  id: string;
   64	  slug: string;
   65	  title: string;
   66	  excerpt: string | null;
   67	  coverImageUrl: string | null;
   68	  content: string;
   69	  publishedAt: Date | null;
   70	};
   71	
   72	export type OutputType = {
   73	  business: {
   74	    id: string;
   75	    slug: string;
   76	    name: string;
   77	    description: string | null;
   78	    logoUrl: string | null;
   79	    heroHeadline: string | null;
   80	    heroSubtext: string | null;
   81	    heroImageUrl: string | null;
   82	    heroCtaLabel: string | null;
   83	    phone: string | null;
   84	    whatsappNumber: string | null;
   85	    email: string | null;
   86	    address: string | null;
   87	    openingHours: string | null;
   88	    themeId: StoreTheme;
   89	    currency: string;
   90	    canUseProductLinks: boolean;
   91	    canUseMultiPage: boolean;
   92	    appearanceSettings?: Record<string, unknown>;
   93	    contentSettings?: Record<string, unknown>;
   94	  };
   95	  categories: StorefrontCategory[];
   96	  products: StorefrontProduct[];
   97	  services: StorefrontService[];
   98	  testimonials: StorefrontTestimonial[];
   99	  portfolio: StorefrontPortfolioItem[];
  100	  blogPosts: StorefrontBlogPost[];
  101	};
  102	
  103	export const getStorefront = async (
  104	  query: InputType,
  105	  init?: RequestInit,
  106	): Promise<OutputType> => {
  107	  const validated = schema.parse(query);
  108	  const params = new URLSearchParams({ slug: validated.slug });
  109	  const result = await fetch(`/_api/storefront?${params.toString()}`, {
  110	    method: "GET",
  111	    ...init,
  112	    headers: {
  113	      "Content-Type": "application/json",
  114	      ...(init?.headers ?? {}),
  115	    },
  116	  });
  117	  if (!result.ok) {
  118	    const errorObject = superjson.parse<{ error: string }>(await result.text());
  119	    throw new Error(errorObject.error);
  120	  }
  121	  return superjson.parse<OutputType>(await result.text());
  122	};
