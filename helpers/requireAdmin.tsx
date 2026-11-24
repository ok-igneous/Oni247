import { getServerUserSession } from "./getServerUserSession";

/**
 * Platform administration chokepoint.
 *
 * This is the ONE place in the codebase allowed to read across tenants, which
 * is why it lives apart from requireOwnedBusiness rather than as a flag on it.
 * Every admin endpoint must start here, and no admin query may ever be reached
 * from an owner-facing route.
 */
export const requireAdmin = async (request: Request) => {
  const { user } = await getServerUserSession(request);

  if (user.role !== "admin") {
    throw new Error("NOT_ADMIN");
  }

  return { user };
};