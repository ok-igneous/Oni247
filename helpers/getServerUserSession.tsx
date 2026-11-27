import { db } from "./db";
import { User } from "./User";

import {
  CleanupProbability,
  getServerSessionOrThrow,
  NotAuthenticatedError,
  SessionExpirationSeconds,
} from "./getSetServerSession";

export async function getServerUserSession(request: Request) {
  const session = await getServerSessionOrThrow(request);

  // Occasionally clean up expired sessions
  if (Math.random() < CleanupProbability) {
    const expirationDate = new Date(
      Date.now() - SessionExpirationSeconds * 1000
    );
    try {
      await db
        .deleteFrom("sessions")
        .where("lastAccessed", "<", expirationDate)
        .execute();
    } catch (cleanupError) {
      // Log but don't fail the request if cleanup fails
      console.error("Session cleanup error:", cleanupError);
    }
  }

  // Query the sessions and users tables in a single join query
  const results = await db
    .selectFrom("sessions")
    .innerJoin("users", "sessions.userId", "users.id")
    .select([
      "sessions.id as sessionId",
      "sessions.createdAt as sessionCreatedAt",
      "sessions.lastAccessed as sessionLastAccessed",
      "sessions.expiresAt as sessionExpiresAt",
      "users.id",
      "users.email",
      "users.displayName",
      "users.role",
      "users.avatarUrl",
      "users.emailVerifiedAt",
    ])
    .where("sessions.id", "=", session.id)
    .limit(1)
    .execute();

  if (results.length === 0) {
    throw new NotAuthenticatedError();
  }

  const result = results[0];
  const now = new Date();
  if (new Date(result.sessionExpiresAt).getTime() <= now.getTime()) {
    await db.deleteFrom("sessions").where("id", "=", session.id).execute();
    throw new NotAuthenticatedError();
  }

  const user = {
    id: result.id,
    email: result.email,
    displayName: result.displayName,
    avatarUrl: result.avatarUrl,
    emailVerifiedAt: result.emailVerifiedAt,
    role: result.role,
  };

  // Persist activity at most once every five minutes to avoid a write on
  // every API call while still keeping active sessions fresh.
  const refreshBefore = new Date(now.getTime() - 5 * 60 * 1000);
  await db
    .updateTable("sessions")
    .set({ lastAccessed: now })
    .where("id", "=", session.id)
    .where("lastAccessed", "<", refreshBefore)
    .where("expiresAt", ">", now)
    .execute();

  return {
    user: user satisfies User,
    // make sure to update the session in cookie
    session: {
      ...session,
      lastAccessed: now,
    },
  };
}

