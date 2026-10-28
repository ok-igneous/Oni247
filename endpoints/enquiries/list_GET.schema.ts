import superjson from "superjson";
import type { Selectable } from "kysely";
import type { Enquiries } from "../../helpers/schema";

export type OutputType = { enquiries: Selectable<Enquiries>[] };

export const getEnquiries = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/enquiries/list`, {
    method: "GET",
   10	    ...init,
   11	    headers: {
   12	      "Content-Type": "application/json",
   13	      ...(init?.headers ?? {}),
   14	    },
   15	  });
   16	  if (!result.ok) {
   17	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   18	    throw new Error(errorObject.error);
   19	  }
   20	  return superjson.parse<OutputType>(await result.text());
   21	};
