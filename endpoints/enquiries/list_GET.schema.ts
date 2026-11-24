import superjson from "superjson";
import type { Selectable } from "kysely";
import type { Enquiries } from "../../helpers/schema";

export type OutputType = { enquiries: Selectable<Enquiries>[] };

export const getEnquiries = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/enquiries/list`, {
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
