import {
  setServerSession,
  NotAuthenticatedError,
} from "../../helpers/getSetServerSession";
import { User } from "../../helpers/User";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";

export async function handle(request: Request) {
   10	  try {
   11	    const { user, session } = await getServerUserSession(request);
   12	
   13	    // Create response with user data
   14	    const response = new Response(
   15	      superjson.stringify({
   16	        user: {
   17	          id: user.id,
   18	          email: user.email,
   19	          displayName: user.displayName,
   20	          avatarUrl: user.avatarUrl,
   21	          emailVerifiedAt: user.emailVerifiedAt,
   22	          role: user.role,
   23	        } satisfies User,
   24	      }),
   25	      {
   26	        headers: {
   27	          "Content-Type": "application/json",
   28	        },
   29	      }
   30	    );
   31	
   32	    // Update the session cookie with the new lastAccessed time
   33	    await setServerSession(response, {
   34	      id: session.id,
   35	      createdAt: session.createdAt,
   36	      lastAccessed: session.lastAccessed.getTime(),
   37	    });
   38	
   39	    return response;
   40	  } catch (error) {
   41	    if (error instanceof NotAuthenticatedError) {
   42	      return new Response(
   43	        superjson.stringify({ error: "Not authenticated" }),
   44	        {
   45	          status: 401,
   46	          headers: {
   47	            "Content-Type": "application/json",
   48	          },
   49	        }
   50	      );
   51	    }
   52	    console.error("Session validation error:", error);
   53	    return new Response(
   54	      superjson.stringify({ error: "Session validation failed" }),
   55	      {
   56	        status: 400,
   57	        headers: {
   58	          "Content-Type": "application/json",
   59	        },
   60	      }
   61	    );
   62	  }
   63	}
   64	
