import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional() });
export type InputType = z.infer<typeof schema>;
export type OutputType = {
  from: Date; to: Date; revenue: number; cogs: number; grossProfit: number;
  grossMargin: number | null; roi: number | null; orderCount: number; unitsSold: number;
  topProducts: { name: string; units: number; revenue: number; grossProfit: number }[];
   10	};
   11	export const getReports = async (query: InputType, init?: RequestInit): Promise<OutputType> => {
   12	  const params = new URLSearchParams(); if (query.from) params.set("from", query.from); if (query.to) params.set("to", query.to);
   13	  const result = await fetch(`/_api/reports?${params.toString()}`, { method: "GET", ...init });
   14	  if (!result.ok) { const body = await result.text(); throw new Error(superjson.parse<{error:string}>(body).error); }
   15	  return superjson.parse<OutputType>(await result.text());
   16	};
