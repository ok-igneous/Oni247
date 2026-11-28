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

  constructor(message: string, options: { retryAt?: number; attemptsRemaining?: number; failedAttempts?: number } = {}) {
    super(message);
    this.name = "LoginAttemptError";
    this.retryAt = options.retryAt;
    this.attemptsRemaining = options.attemptsRemaining;
    this.failedAttempts = options.failedAttempts;
  }
}

type LoginResponsePayload = Partial<OutputType> & {
  message?: string;
  retryAt?: number;
  attemptsRemaining?: number;
  failedAttempts?: number;
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
  if (!result.ok) {
    if (payload?.code === "ORIGIN_CHECK_FAILED") {
      throw new LoginAttemptError("We couldn’t verify this request. Refresh the page and try again. If it keeps happening, open Oni247 in a new tab.");
    }
    const fallback =
      result.status === 429
        ? "Too many failed login attempts. Your account is temporarily locked."
        : result.status === 401
          ? "Invalid email or password."
          : result.status >= 500
            ? "The login service is temporarily unavailable. Please try again shortly."
            : `Login failed (HTTP ${result.status}). Please try again.`;
    throw new LoginAttemptError(apiErrorMessage(payload, fallback), {
      retryAt: typeof payload?.retryAt === "number" ? payload.retryAt : undefined,
      attemptsRemaining: typeof payload?.attemptsRemaining === "number" ? payload.attemptsRemaining : undefined,
      failedAttempts: typeof payload?.failedAttempts === "number" ? payload.failedAttempts : undefined,
    });
  }

  if (!payload || typeof payload !== "object" || !payload.user) {
    throw new Error("The login service returned an invalid response. Please try again.");
  }

  return { user: payload.user };
};
