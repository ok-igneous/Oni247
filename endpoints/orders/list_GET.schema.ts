import superjson from "superjson";
import type {
  OrderSource,
  OrderStatus,
  ShippingStatus,
} from "../../helpers/schema";

export type OrderLine = {
  productId: string;
   10	  name: string;
   11	  quantity: number;
   12	  unitPrice: number;
   13	  lineTotal: number;
   14	};
   15	
   16	export type OwnerOrder = {
   17	  id: string;
   18	  trackingCode: string;
   19	  customerName: string;
   20	  customerPhone: string | null;
   21	  items: OrderLine[];
   22	  totalAmount: number;
   23	  currency: string;
   24	  status: OrderStatus;
   25	  shippingStatus: ShippingStatus;
   26	  source: OrderSource;
   27	  deliveryAddress: string | null;
   28	  ownerNote: string | null;
   29	  createdAt: Date;
   30	};
   31	
   32	export type OutputType = { orders: OwnerOrder[] };
   33	
   34	export const getOrders = async (init?: RequestInit): Promise<OutputType> => {
   35	  const result = await fetch(`/_api/orders/list`, {
   36	    method: "GET",
   37	    ...init,
   38	    headers: {
   39	      "Content-Type": "application/json",
   40	      ...(init?.headers ?? {}),
   41	    },
   42	  });
   43	  if (!result.ok) {
   44	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   45	    throw new Error(errorObject.error);
   46	  }
   47	  return superjson.parse<OutputType>(await result.text());
   48	};
