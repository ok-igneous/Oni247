import { z } from "zod";
import superjson from "superjson";
import type { OrderStatus, ShippingStatus } from "../helpers/schema";
import type { StorefrontProduct } from "./storefront_GET.schema";

export const schema = z.object({
  code: z
    .string()
    .trim()
   10	    .min(6)
   11	    .max(16)
   12	    .transform((value) => value.toUpperCase()),
   13	});
   14	
   15	export type InputType = z.infer<typeof schema>;
   16	
   17	export type TrackedOrder = {
   18	  trackingCode: string;
   19	  customerName: string;
   20	  items: { name: string; quantity: number; lineTotal: number }[];
   21	  totalAmount: number;
   22	  currency: string;
   23	  status: OrderStatus;
   24	  shippingStatus: ShippingStatus;
   25	  deliveryAddress: string | null;
   26	  ownerNote: string | null;
   27	  createdAt: Date;
   28	  updatedAt: Date;
   29	};
   30	
   31	export type OutputType = {
   32	  order: TrackedOrder;
   33	  business: {
   34	    name: string;
   35	    slug: string;
   36	    phone: string | null;
   37	    whatsappNumber: string | null;
   38	    logoUrl?: string | null;
   39	    heroImageUrl?: string | null;
   40	    themeId?: import("../helpers/schema").StoreTheme;
   41	    appearanceSettings?: Record<string, unknown>;
   42	  };
   43	  recommended: StorefrontProduct[];
   44	};
   45	
   46	export const getTrackedOrder = async (
   47	  query: InputType,
   48	  init?: RequestInit,
   49	): Promise<OutputType> => {
   50	  const validated = schema.parse(query);
   51	  const params = new URLSearchParams({ code: validated.code });
   52	  const result = await fetch(`/_api/track?${params.toString()}`, {
   53	    method: "GET",
   54	    ...init,
   55	    headers: {
   56	      "Content-Type": "application/json",
   57	      ...(init?.headers ?? {}),
   58	    },
   59	  });
   60	  if (!result.ok) {
   61	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   62	    throw new Error(errorObject.error);
   63	  }
   64	  return superjson.parse<OutputType>(await result.text());
   65	};
