import superjson from "superjson";
import type { Selectable } from "kysely";
import type { Categories } from "../../helpers/schema";

export type OutputType = {
  categories: Selectable<Categories>[];
};

export const getCategories = async (init?: RequestInit): Promise<OutputType> => {
   10	  const result = await fetch(`/_api/categories/list`, {
   11	    method: "GET",
   12	    ...init,
   13	    headers: {
   14	      "Content-Type": "application/json",
   15	      ...(init?.headers ?? {}),
   16	    },
   17	  });
   18	  if (!result.ok) {
   19	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   20	    throw new Error(errorObject.error);
   21	  }
   22	  return superjson.parse<OutputType>(await result.text());
   23	};
