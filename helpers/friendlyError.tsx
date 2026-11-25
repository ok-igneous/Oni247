import { ZodError } from "zod";

const FIELD_LABELS: Record<string, string> = {
  coverImageUrl: "cover image",
  imageUrl: "image",
  name: "name",
  title: "title",
  slug: "page address",
  email: "email",
  phone: "phone number",
  price: "price",
  startsAt: "start date",
  endsAt: "end date",
};

/**
 * Turns any error into a sentence a shop owner can act on. Form validation
 * errors become "Check the cover image: …" instead of raw JSON, and network
 * failures say so plainly.
 */
export const friendlyError = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string => {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    if (!issue) return fallback;
    const lastKey = [...issue.path].reverse().find((part) => typeof part === "string");
    const label = lastKey ? FIELD_LABELS[String(lastKey)] : undefined;
    const message = issue.message.replace(/^Invalid url$/i, "That link is not valid");
    const more = error.issues.length > 1 ? ` (and ${error.issues.length - 1} more to fix)` : "";
    return label && !message.toLowerCase().includes(label)
      ? `Check the ${label}: ${message}${more}`
      : `${message}${more}`;
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    // A ZodError that lost its class across a bundle boundary still carries JSON.
    if (message.startsWith("[") && message.includes('"code"')) {
      try {
        const issues = JSON.parse(message) as Array<{ message?: string; path?: unknown[] }>;
        const first = issues[0];
        if (first?.message) {
          const more = issues.length > 1 ? ` (and ${issues.length - 1} more to fix)` : "";
          return `${first.message}${more}`;
        }
      } catch {
        /* fall through */
      }
      return fallback;
    }
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return "We could not reach the server. Check your internet connection and try again.";
    }
    if (/not authenticated/i.test(message)) {
      return "Your session has ended. Please sign in again.";
    }
    if (message.length > 0 && message.length < 200) return message;
  }

  return fallback;
};

