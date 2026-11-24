import superjson from "superjson";
import type { OrderStatus } from "../../helpers/schema";

export type CustomerOrderSummary = {
  id: string;
  trackingCode: string;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  createdAt: Date;
  itemSummary: string;
};

export type OwnerCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  lastAddress: string | null;
  notes: string | null;
  createdAt: Date;
  /** Orders that were not cancelled. */
  orderCount: number;
  /** Sum of orders that were not cancelled. */
  totalSpent: number;
  lastOrderAt: Date | null;
  recentOrders: CustomerOrderSummary[];
};

export type OutputType = { customers: OwnerCustomer[] };

export const getCustomers = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/customers/list`, {
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
