import superjson from "superjson";

export type OutputType = { isOwner: boolean; roleName: string; permissions: string[] };

export const getTeamMe = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/team/me`, { method: "GET", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};

