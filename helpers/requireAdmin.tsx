import { getServerUserSession } from "./getServerUserSession";

/**
 * Platform administration chokepoint.
 *
 * This is the ONE place in the codebase allowed to read across tenants, which
 * is why it lives apart from requireOwnedBusiness rather than as a flag on it.
 * Every admin endpoint must start here, and no admin query may ever be reached
 * from an owner-facing route.
   10	 */
   11	export const requireAdmin = async (request: Request) => {
   12	  const { user } = await getServerUserSession(request);
   13	
   14	  if (user.role !== "admin") {
   15	    throw new Error("NOT_ADMIN");
   16	  }
   17	
   18	  return { user };
   19	};
