import superjson from "superjson";
import type {
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderSource,
  OrderStatus,
  ShippingStatus,
} from "../../helpers/schema";

export type OrderLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  variantLabel?: string | null;
};

export type OwnerOrder = {
  id: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string | null;
  items: OrderLine[];
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  shippingStatus: ShippingStatus;
  source: OrderSource;
  deliveryAddress: string | null;
  ownerNote: string | null;
  createdAt: Date;
  /** Items total is totalAmount - deliveryFee. */
  deliveryFee: number;
  deliveryZone: string | null;
  paymentMethod: OrderPaymentMethod | null;
  paymentStatus: OrderPaymentStatus;
  customerNote: string | null;
  customerId: string | null;
};

export type OutputType = { orders: OwnerOrder[] };

export const getOrders = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/orders/list`, {
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
