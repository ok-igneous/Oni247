import superjson from "superjson";

export type OutputType = { sentTo: string };

export const postTestEmail = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/email/test`, { method: "POST", body: superjson.stringify({}), ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
