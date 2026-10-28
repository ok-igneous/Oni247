import superjson from "superjson";

export type OwnerShowcase = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  productIds: string[];
  viewCount: number;
   10	  createdAt: Date;
   11	};
   12	
   13	export type OutputType = { showcases: OwnerShowcase[] };
   14	
   15	export const getShowcases = async (init?: RequestInit): Promise<OutputType> => {
   16	  const result = await fetch(`/_api/showcases/list`, {
   17	    method: "GET",
   18	    ...init,
   19	    headers: {
   20	      "Content-Type": "application/json",
   21	      ...(init?.headers ?? {}),
   22	    },
   23	  });
   24	  if (!result.ok) {
   25	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   26	    throw new Error(errorObject.error);
   27	  }
   28	  return superjson.parse<OutputType>(await result.text());
   29	};
