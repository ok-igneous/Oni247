import superjson from "superjson";
import type { Selectable } from "kysely";
import type { Businesses } from "../../helpers/schema";

export type OutputType = {
  business: Selectable<Businesses> | null;
  platformRootDomain: string;
};

export const getMyBusiness = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/business/me`, {
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
