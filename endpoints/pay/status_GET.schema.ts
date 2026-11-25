import superjson from "superjson";

export type OutputType = { status: "paid" | "pending" | "failed"; amount: number; currency: string; title: string };

export const getPayStatus = async (ref: string, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/pay/status?ref=${encodeURIComponent(ref)}`, { method: "GET", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
