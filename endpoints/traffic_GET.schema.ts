import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type OutputType = {
  from: string;
  to: string;
  enquiries: number;
  orders: number;
  completedOrders: number;
  conversionRate: number | null;
};

export const getTraffic = async (query: { from?: string; to?: string }, init?: RequestInit): Promise<OutputType> => {
  const validated = schema.parse(query);
  const params = new URLSearchParams();
  if (validated.from) params.set("from", validated.from);
  if (validated.to) params.set("to", validated.to);
  const response = await fetch(`/_api/traffic?${params.toString()}`, { method: "GET", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!response.ok) {
    const errorObject = superjson.parse<{ error: string }>(await response.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await response.text());
};
