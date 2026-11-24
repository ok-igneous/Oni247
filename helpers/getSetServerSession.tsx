import { jwtVerify, SignJWT } from "jose";

const encoder = new TextEncoder();
const COOKIE_NAME = "oni247_session";

const signingKey = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  return encoder.encode(secret);
};

const secureCookie = () =>
  process.env.COOKIE_SECURE === "true" ||
  (process.env.COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production");

export const SessionExpirationSeconds = 60 * 60 * 24 * 7;
export const CleanupProbability = 0.1;

export interface Session {
  id: string;
  createdAt: number;
  lastAccessed: number;
  passwordChangeRequired?: boolean;
}

export class NotAuthenticatedError extends Error {
  constructor(message?: string) {
    super(message ?? "Not authenticated");
    this.name = "NotAuthenticatedError";
  }
}

export async function getServerSessionOrThrow(request: Request): Promise<Session> {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const token = cookie?.slice(COOKIE_NAME.length + 1);
  if (!token) throw new NotAuthenticatedError();

  // Configuration failures are server errors, not invalid-user sessions.
  // Resolve the signing key outside the verification catch so a missing or
  // undersized JWT_SECRET cannot silently downgrade authentication handling.
  const key = signingKey();
  try {
    const { payload } = await jwtVerify(token, key);
    if (typeof payload.id !== "string") throw new Error("Invalid session payload");
    return {
      id: payload.id,
      createdAt: Number(payload.createdAt ?? 0),
      lastAccessed: Number(payload.lastAccessed ?? 0),
      passwordChangeRequired: payload.passwordChangeRequired === true,
    };
  } catch {
    throw new NotAuthenticatedError();
  }
}

export async function setServerSession(response: Response, session: Session): Promise<void> {
  const token = await new SignJWT({
    id: session.id,
    createdAt: session.createdAt,
    lastAccessed: session.lastAccessed,
    passwordChangeRequired: session.passwordChangeRequired,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SessionExpirationSeconds}s`)
    .sign(signingKey());

  const cookie = [
    `${COOKIE_NAME}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SessionExpirationSeconds}`,
    ...(secureCookie() ? ["Secure"] : []),
  ];
  response.headers.set("Set-Cookie", cookie.join("; "));
}

export function clearServerSession(response: Response): void {
  const cookie = [
    `${COOKIE_NAME}=`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
    ...(secureCookie() ? ["Secure"] : []),
  ];
  response.headers.set("Set-Cookie", cookie.join("; "));
}
