import { z } from "zod";
import superjson from "superjson";
import type {
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderStatus,
  ShippingStatus,
} from "../helpers/schema";
import type { StorefrontProduct } from "./storefront_GET.schema";

export const schema = z.object({
  code: z
    .string()
    .trim()
    .min(6)
    .max(16)
    .transform((value) => value.toUpperCase()),
});

export type InputType = z.infer<typeof schema>;

export type TrackedOrder = {
  trackingCode: string;
  customerName: string;
  items: {
    name: string;
    quantity: number;
    lineTotal: number;
    variantLabel?: string | null;
  }[];
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  shippingStatus: ShippingStatus;
  deliveryAddress: string | null;
  ownerNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  deliveryFee?: number;
  deliveryZone?: string | null;
  paymentMethod?: OrderPaymentMethod | null;
  paymentStatus?: OrderPaymentStatus;
  /** Only while a bank-transfer order is still unpaid. */
  bank?: { bankName: string; accountName: string; accountNumber: string } | null;
};

export type OutputType = {
  order: TrackedOrder;
  business: {
    name: string;
    slug: string;
    phone: string | null;
    whatsappNumber: string | null;
    logoUrl?: string | null;
    heroImageUrl?: string | null;
    themeId?: import("../helpers/schema").StoreTheme;
    appearanceSettings?: Record<string, unknown>;
  };
  recommended: StorefrontProduct[];
};

export const getTrackedOrder = async (
  query: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validated = schema.parse(query);
  const params = new URLSearchParams({ code: validated.code });
  const result = await fetch(`/_api/track?${params.toString()}`, {
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
