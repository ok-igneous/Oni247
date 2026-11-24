import superjson from "superjson";

export type OwnerShowcase = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  productIds: string[];
  viewCount: number;
  createdAt: Date;
};

export type OutputType = { showcases: OwnerShowcase[] };

export const getShowcases = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/showcases/list`, {
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
