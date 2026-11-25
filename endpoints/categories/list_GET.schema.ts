import superjson from "superjson";
import type { Selectable } from "kysely";
import type { Categories } from "../../helpers/schema";

export type OutputType = {
  categories: Selectable<Categories>[];
};

export const getCategories = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/categories/list`, {
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
