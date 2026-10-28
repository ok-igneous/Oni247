import { db } from "./db";
import { getServerUserSession } from "./getServerUserSession";

/**
 * THE tenant-isolation chokepoint. Every owner-side endpoint must start here.
 *
 * The caller's business is derived from the SESSION, never from the request
 * body or query string, so there is no client-supplied id to tamper with. If an
 * endpoint does receive a business id (e.g. a future multi-business owner), it
   10	 * is passed in here and verified against owner_id before anything is returned.
   11	 *
   12	 * Endpoints must then scope every query with `.where("businessId", "=", business.id)`.
   13	 */
   14	export const requireOwnedBusiness = async (
   15	  request: Request,
   16	  requestedBusinessId?: string,
   17	) => {
   18	  const { user } = await getServerUserSession(request);
   19	
   20	  let query = db
   21	    .selectFrom("businesses")
   22	    .selectAll()
   23	    .where("ownerId", "=", user.id);
   24	
   25	  if (requestedBusinessId) {
   26	    query = query.where("id", "=", requestedBusinessId);
   27	  }
   28	
   29	  const business = await query.limit(1).executeTakeFirst();
   30	
   31	  if (!business) {
   32	    // Same response whether the business does not exist or belongs to someone
   33	    // else — never confirm the existence of another tenant's record.
   34	    throw new Error("NO_BUSINESS");
   35	  }
   36	
   37	  return { user, business };
   38	};
