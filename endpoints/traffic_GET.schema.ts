import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type OutputType = {
   10	  from: string;
   11	  to: string;
   12	  enquiries: number;
   13	  orders: number;
   14	  completedOrders: number;
   15	  conversionRate: number | null;
   16	};
   17	
   18	export const getTraffic = async (query: { from?: string; to?: string }, init?: RequestInit): Promise<OutputType> => {
   19	  const validated = schema.parse(query);
   20	  const params = new URLSearchParams();
   21	  if (validated.from) params.set("from", validated.from);
   22	  if (validated.to) params.set("to", validated.to);
   23	  const response = await fetch(`/_api/traffic?${params.toString()}`, { method: "GET", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
   24	  if (!response.ok) {
   25	    const errorObject = superjson.parse<{ error: string }>(await response.text());
   26	    throw new Error(errorObject.error);
   27	  }
   28	  return superjson.parse<OutputType>(await response.text());
   29	};