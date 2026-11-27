import superjson from "superjson";

export type OutputType =
  | { hasBusiness: false }
  | {
      hasBusiness: true;
      businessName: string;
      slug: string;
      platformRootDomain: string | null;
      primaryDomain: string | null;
      platformWildcardReady: boolean;
      status: string;
      productCount: number;
      categoryCount: number;
      newEnquiryCount: number;
      pendingOrderCount: number;
    };

export const getDashboardOverview = async (
  init?: RequestInit,
): Promise<OutputType> => {
  const result = await fetch(`/_api/dashboard/overview`, {
    method: "GET",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!result.ok) {
    const body = await result.text();
    let message: string | undefined;
    const readMessage = (value: unknown): string | undefined => {
      if (!value || typeof value !== "object") return undefined;
      const record = value as Record<string, unknown>;
      if (typeof record.error === "string") return record.error;
      if (typeof record.message === "string") return record.message;
      return undefined;
    };
    try {
      message = readMessage(superjson.parse<unknown>(body));
    } catch {
      // Some infrastructure errors are plain JSON or text rather than SuperJSON.
    }
    if (!message) {
      try { message = readMessage(JSON.parse(body) as unknown); }
      catch { /* Use the status-based fallback for non-JSON error pages. */ }
    }
    throw new Error(message || `Request failed (HTTP ${result.status}). Please try again.`);
  }
  return superjson.parse<OutputType>(await result.text());
};
