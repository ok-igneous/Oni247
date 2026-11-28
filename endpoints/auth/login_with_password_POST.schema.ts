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

  constructor(message: string, options: { retryAt?: number; attemptsRemaining?: number } = {}) {
    super(message);
    this.name = "LoginAttemptError";
    this.retryAt = options.retryAt;
    this.attemptsRemaining = options.attemptsRemaining;
  }
}

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
  const payload = parseApiPayload<OutputType>(responseText);

  if (!result.ok) {
    const fallback =
      result.status === 401
        ? "Invalid email or password."
        : result.status === 429
          ? "Too many login attempts. Please wait and try again."
          : result.status >= 500
            ? "The login service is temporarily unavailable. Please try again shortly."
            : `Login failed (HTTP ${result.status}). Please try again.`;
    throw new LoginAttemptError(apiErrorMessage(payload, fallback), {
      retryAt: typeof payload?.retryAt === "number" ? payload.retryAt : undefined,
      attemptsRemaining: typeof payload?.attemptsRemaining === "number" ? payload.attemptsRemaining : undefined,
    });
  }

  if (!payload || typeof payload !== "object" || !payload.user) {
    throw new Error("The login service returned an invalid response. Please try again.");
  }

  return payload;
};
