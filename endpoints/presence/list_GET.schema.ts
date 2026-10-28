import superjson from "superjson";
import type { Selectable } from "kysely";
import type { PortfolioItems, Testimonials } from "../../helpers/schema";

export type OutputType = {
  testimonials: Selectable<Testimonials>[];
  portfolio: Selectable<PortfolioItems>[];
  canEdit: boolean;
};
   10	
   11	export const getPresence = async (init?: RequestInit): Promise<OutputType> => {
   12	  const result = await fetch(`/_api/presence/list`, {
   13	    method: "GET",
   14	    ...init,
   15	    headers: {
   16	      "Content-Type": "application/json",
   17	      ...(init?.headers ?? {}),
   18	    },
   19	  });
   20	  if (!result.ok) {
   21	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   22	    throw new Error(errorObject.error);
   23	  }
   24	  return superjson.parse<OutputType>(await result.text());
   25	};
