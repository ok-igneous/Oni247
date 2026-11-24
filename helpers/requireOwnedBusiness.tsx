import { db } from "./db";
import { getServerUserSession } from "./getServerUserSession";
import { loadPlanConfig } from "./planConfig";
import { ADDONS, isAddonEnabled } from "./addons";
import { ALL_PERMISSIONS, actionForRequest, permits, targetForPath } from "./permissions";

export type BusinessAccess = {
  isOwner: boolean;
  roleName: string;
  /** What this person may do. The owner has every permission. */
  permissions: string[];
};

/**
 * THE tenant-isolation chokepoint. Every owner-side endpoint must start here.
 *
 * The caller's business is derived from the SESSION, never from the request
 * body or query string, so there is no client-supplied id to tamper with. The
 * session user is either the business owner or an active member of its team
 * (when the Team add-on is on). A team member is held to their role here, once,
 * for every endpoint: the endpoint's own path decides which permission is needed.
 *
 * Endpoints must then scope every query with `.where("businessId", "=", business.id)`.
 */
export const requireOwnedBusiness = async (request: Request, requestedBusinessId?: string) => {
  const { user } = await getServerUserSession(request);
  await loadPlanConfig();

  let ownerQuery = db.selectFrom("businesses").selectAll().where("ownerId", "=", user.id);
  if (requestedBusinessId) ownerQuery = ownerQuery.where("id", "=", requestedBusinessId);
  let business = await ownerQuery.limit(1).executeTakeFirst();
  let access: BusinessAccess = { isOwner: true, roleName: "Owner", permissions: ALL_PERMISSIONS };

  if (!business) {
    const email = String(user.email ?? "").trim().toLowerCase();
    let memberQuery = db
      .selectFrom("teamMembers")
      .innerJoin("businesses", "businesses.id", "teamMembers.businessId")
      .leftJoin("teamRoles", "teamRoles.id", "teamMembers.roleId")
      .selectAll("businesses")
      .select(["teamMembers.id as memberId", "teamMembers.status as memberStatus", "teamRoles.name as roleName", "teamRoles.permissions as rolePermissions"])
      .where("teamMembers.email", "=", email)
      .where("teamMembers.status", "!=", "disabled");
    if (requestedBusinessId) memberQuery = memberQuery.where("businesses.id", "=", requestedBusinessId);
    const row = email ? await memberQuery.limit(1).executeTakeFirst() : undefined;
    // Same answer whether the business does not exist or this person is not on its team.
    if (!row || !isAddonEnabled((row.appearanceSettings ?? {}) as Record<string, unknown>, "team")) throw new Error("NO_BUSINESS");

    const { memberId, memberStatus, roleName, rolePermissions, ...rest } = row;
    business = rest;
    const permissions = Array.isArray(rolePermissions) ? rolePermissions.filter((p): p is string => typeof p === "string") : [];
    access = { isOwner: false, roleName: roleName ?? "Member", permissions };

    const url = new URL(request.url);
    const target = targetForPath(url.pathname);
    const allowed =
      target.kind === "open" ||
      (target.kind === "module" && permits(permissions, target.module, actionForRequest(request.method, url.pathname)));
    if (!allowed) throw new Error("FORBIDDEN");

    if (memberStatus === "invited") {
      await db.updateTable("teamMembers").set({ status: "active", userId: user.id, updatedAt: new Date() }).where("id", "=", memberId).execute();
    }
  }

  // Add-ons the shop bought separately switch on their feature, whatever its plan includes.
  const now = new Date();
  const bought = await db.selectFrom("addonPurchases").select("addonId").where("businessId", "=", business.id).where("expiresAt", ">", now).execute();
  const extraFeatures = ADDONS.filter((a) => a.feature && bought.some((b) => b.addonId === a.id)).map((a) => a.feature as string);

  return { user, business: { ...business, extraFeatures }, access };
};

