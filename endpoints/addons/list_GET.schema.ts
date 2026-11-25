import superjson from "superjson";
import type { AddonAccess, AddonId } from "../../helpers/addons";

export type AddonItem = {
  id: AddonId;
  name: string;
  description: string;
  access: AddonAccess;
  comingSoon: boolean;
  enabled: boolean;
  entitled: boolean;
  /** Added for add-on pricing. Older app versions ignore these. */
  via?: "free" | "plan" | "purchase" | null;
  includedIn?: string[];
  priceMonthlyNgn?: number;
  expiresAt?: Date | null;
};

export type OutputType = { items: AddonItem[]; isPremiumPlus: boolean; paymentsConfigured?: boolean; maxDurationMonths?: number };

export const getAddons = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/addons/list`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
