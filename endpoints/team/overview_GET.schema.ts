import superjson from "superjson";

export type TeamRole = { id: string; name: string; description: string; permissions: string[]; isSystem: boolean; memberCount: number };
export type TeamMember = { id: string; email: string; displayName: string; roleId: string | null; roleName: string | null; status: string; createdAt: Date };
export type OutputType = { enabled: boolean; ownerEmail: string; roles: TeamRole[]; members: TeamMember[] };

export const getTeam = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/team/overview`, { method: "GET", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};

