import superjson from "superjson";
import type { Landing } from "../helpers/landingConfig";

export type LandingPlan = { id: string; name: string; description: string; priceMonthlyNgn: number; highlighted: boolean; features: string[]; productLimit: number | null };
export type OutputType = { landing: Landing; plans: LandingPlan[] };

export const getLanding = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/landing`, { method: "GET", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};