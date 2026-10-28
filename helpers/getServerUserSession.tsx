import { db } from "./db";
import { User } from "./User";

import {
  CleanupProbability,
  getServerSessionOrThrow,
  NotAuthenticatedError,
  SessionExpirationSeconds,
} from "./getSetServerSession";
   10	
   11	export async function getServerUserSession(request: Request) {
   12	  const session = await getServerSessionOrThrow(request);
   13	
   14	  // Occasionally clean up expired sessions
   15	  if (Math.random() < CleanupProbability) {
   16	    const expirationDate = new Date(
   17	      Date.now() - SessionExpirationSeconds * 1000
   18	    );
   19	    try {
   20	      await db
   21	        .deleteFrom("sessions")
   22	        .where("lastAccessed", "<", expirationDate)
   23	        .execute();
   24	    } catch (cleanupError) {
   25	      // Log but don't fail the request if cleanup fails
   26	      console.error("Session cleanup error:", cleanupError);
   27	    }
   28	  }
   29	
   30	  // Query the sessions and users tables in a single join query
   31	  const results = await db
   32	    .selectFrom("sessions")
   33	    .innerJoin("users", "sessions.userId", "users.id")
   34	    .select([
   35	      "sessions.id as sessionId",
   36	      "sessions.createdAt as sessionCreatedAt",
   37	      "sessions.lastAccessed as sessionLastAccessed",
   38	      "users.id",
   39	      "users.email",
   40	      "users.displayName",
   41	      "users.role",
   42	      "users.avatarUrl",
   43	      "users.emailVerifiedAt",
   44	    ])
   45	    .where("sessions.id", "=", session.id)
   46	    .limit(1)
   47	    .execute();
   48	
   49	  if (results.length === 0) {
   50	    throw new NotAuthenticatedError();
   51	  }
   52	
   53	  const result = results[0];
   54	  const user = {
   55	    id: result.id,
   56	    email: result.email,
   57	    displayName: result.displayName,
   58	    avatarUrl: result.avatarUrl,
   59	    emailVerifiedAt: result.emailVerifiedAt,
   60	    role: result.role,
   61	  };
   62	
   63	  // Update the session's lastAccessed timestamp
   64	  const now = new Date();
   65	  await db
   66	    .updateTable("sessions")
   67	    .set({ lastAccessed: now })
   68	    .where("id", "=", session.id)
   69	    .execute();
   70	
   71	  return {
   72	    user: user satisfies User,
   73	    // make sure to update the session in cookie
   74	    session: {
   75	      ...session,
   76	      lastAccessed: now,
   77	    },
   78	  };
   79	}
   80	
