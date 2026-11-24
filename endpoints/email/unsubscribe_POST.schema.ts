import superjson from "superjson";

export type OutputType = { ok: true };

export const postUnsubscribe = async (token: string, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/email/unsubscribe?t=${encodeURIComponent(token)}`, { method: "POST", ...init });
  return superjson.parse<OutputType>(await result.text());
};
