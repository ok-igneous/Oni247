import { z } from "zod";
import { User } from "../../helpers/User";
import superjson from "superjson";
import { apiErrorMessage, parseApiPayload } from "../../helpers/apiResponse";

export const schema = z.object({
  email: z.string().email("Email is required"),
  password: z.string().min(1, "Password is required"),
});

export class LoginAttemptError extends Error {
  retryAt?: number;
  attemptsRemaining?: number;
  failedAttempts?: number;
  remainingMinutes?: number;
  requestCount?: number;
  requestLimit?: number;
  requestsRemaining?: number;

  constructor(message: string, options: { retryAt?: number; attemptsRemaining?: number; failedAttempts?: number; remainingMinutes?: number; requestCount?: number; requestLimit?: number; requestsRemaining?: number } = {}) {
    super(message);
    this.name = "LoginAttemptError";
    this.retryAt = options.retryAt;
    this.attemptsRemaining = options.attemptsRemaining;
    this.failedAttempts = options.failedAttempts;
    this.remainingMinutes = options.remainingMinutes;
    this.requestCount = options.requestCount;
    this.requestLimit = options.requestLimit;
    this.requestsRemaining = options.requestsRemaining;
  }
}

type LoginResponsePayload = Partial<OutputType> & {
  message?: string;
  retryAt?: number;
  attemptsRemaining?: number;
  failedAttempts?: number;
  remainingMinutes?: number;
  requestCount?: number;
  requestLimit?: number;
  requestsRemaining?: number;
  retryAfterSeconds?: number;
  code?: string;
};

export type OutputType = {
  user: User;
};

export const postLogin = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/auth/login_with_password`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  const responseText = await result.text();
  const payload = parseApiPayload<LoginResponsePayload>(responseText);
  // Some hosting/proxy layers preserve Retry-After but replace the JSON body.
  // Keep the UI useful even when the structured rate-limit payload is missing.
  const retryAfterHeader = Number(result.headers.get("Retry-After"));
  const headerRetryAt = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
    ? Date.now() + retryAfterHeader * 1000
    : undefined;

  if (!result.ok) {
    if (payload?.code === "ORIGIN_CHECK_FAILED") {
      throw new LoginAttemptError("We couldn’t verify this request. Refresh the page and try again. If it keeps happening, open Oni247 in a new tab.");
    }
    const fallback =
      result.status === 429
        ? "Too many login requests. Please wait before trying again."
        : result.status === 401
          ? "Invalid email or password."
          : result.status >= 500
            ? "The login service is temporarily unavailable. Please try again shortly."
            : `Login failed (HTTP ${result.status}). Please try again.`;
    throw new LoginAttemptError(apiErrorMessage(payload, fallback), {
      retryAt: typeof payload?.retryAt === "number" ? payload.retryAt : (result.status === 429 ? headerRetryAt : undefined),
      attemptsRemaining: typeof payload?.attemptsRemaining === "number" ? payload.attemptsRemaining : undefined,
      failedAttempts: typeof payload?.failedAttempts === "number" ? payload.failedAttempts : undefined,
      remainingMinutes: typeof payload?.remainingMinutes === "number" ? payload.remainingMinutes : undefined,
      requestCount: typeof payload?.requestCount === "number" ? payload.requestCount : (result.status === 429 && typeof payload?.failedAttempts !== "number" ? 20 : undefined),
      requestLimit: typeof payload?.requestLimit === "number" ? payload.requestLimit : (result.status === 429 && typeof payload?.failedAttempts !== "number" ? 20 : undefined),
      requestsRemaining: typeof payload?.requestsRemaining === "number" ? payload.requestsRemaining : (result.status === 429 && typeof payload?.failedAttempts !== "number" ? 0 : undefined),
    });
  }

  if (!payload || typeof payload !== "object" || !payload.user) {
    throw new Error("The login service returned an invalid response. Please try again.");
  }

  return { user: payload.user };
};
