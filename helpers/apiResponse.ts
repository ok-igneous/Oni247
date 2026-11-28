import superjson from "superjson";

/** Parse API responses without assuming every server/proxy error is SuperJSON. */
export function parseApiPayload<T = unknown>(body: string): T | null {
  const text = body.trim();
  if (!text) return null;

  try {
    const decoded = superjson.parse<unknown>(text);
    // superjson.parse may return undefined for a plain JSON envelope instead
    // of throwing; only accept a decoded value when it actually exists.
    if (decoded !== undefined) return decoded as T;
  } catch {
    // Some infrastructure errors are plain JSON rather than SuperJSON.
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Extract a safe, user-facing message from known API error envelope shapes. */
export function apiErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["message", "error", "detail"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }

  if (typeof payload === "string" && payload.trim()) return payload.trim();
  return fallback;
}
