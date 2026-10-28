// adapt this to your database schema
import { db } from "../../helpers/db";
import {
  getServerSessionOrThrow,
  clearServerSession,
  NotAuthenticatedError,
} from "../../helpers/getSetServerSession";
import superjson from "superjson";

   10	export async function handle(request: Request) {
   11	  try {
   12	    // Get the current session
   13	    const session = await getServerSessionOrThrow(request);
   14	
   15	    // Delete the session from the database
   16	    await db.deleteFrom("sessions").where("id", "=", session.id).execute();
   17	
   18	    // Create response with success message
   19	    const response = new Response(
   20	      superjson.stringify({
   21	        success: true,
   22	        message: "Logged out successfully",
   23	      }),
   24	      {
   25	        headers: {
   26	          "Content-Type": "application/json",
   27	        },
   28	      }
   29	    );
   30	
   31	    clearServerSession(response);
   32	
   33	    return response;
   34	  } catch (error) {
   35	    if (error instanceof NotAuthenticatedError) {
   36	      return new Response(
   37	        superjson.stringify({ error: "Not authenticated" }),
   38	        {
   39	          status: 401,
   40	          headers: {
   41	            "Content-Type": "application/json",
   42	          },
   43	        }
   44	      );
   45	    }
   46	    console.error("Logout error:", error);
   47	    return new Response(
   48	      superjson.stringify({
   49	        error: "Logout failed",
   50	        message: error instanceof Error ? error.message : "Unknown error",
   51	      }),
   52	      {
   53	        status: 500,
   54	        headers: {
   55	          "Content-Type": "application/json",
   56	        },
   57	      }
   58	    );
   59	  }
   60	}
   61	
