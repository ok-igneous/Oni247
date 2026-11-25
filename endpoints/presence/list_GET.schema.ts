import superjson from "superjson";
import type { Selectable } from "kysely";
import type { PortfolioItems, Testimonials } from "../../helpers/schema";

export type OutputType = {
  testimonials: Selectable<Testimonials>[];
  portfolio: Selectable<PortfolioItems>[];
  canEdit: boolean;
};

export const getPresence = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/presence/list`, {
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
