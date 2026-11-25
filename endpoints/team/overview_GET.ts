import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { isAddonEnabled } from "../../helpers/addons";
import { SYSTEM_ROLES } from "../../helpers/permissions";
import type { Json } from "../../helpers/schema";
import type { OutputType } from "./overview_GET.schema";

export async function handle(request: Request) {
  try {
    const { business, user } = await requireOwnedBusiness(request);
    const enabled = isAddonEnabled((business.appearanceSettings ?? {}) as Record<string, unknown>, "team");

    // A shop's first visit sets up the standard roles, which the owner can then change.
    const existing = await db.selectFrom("teamRoles").select("id").where("businessId", "=", business.id).limit(1).executeTakeFirst();
    if (!existing) {
      await db
        .insertInto("teamRoles")
        .values(SYSTEM_ROLES.map((r) => ({ businessId: business.id, name: r.name, description: r.description, permissions: r.permissions as unknown as Json, isSystem: true })))
        .execute();
    }

    const roles = await db.selectFrom("teamRoles").selectAll().where("businessId", "=", business.id).orderBy("isSystem", "desc").orderBy("name").execute();
    const members = await db
      .selectFrom("teamMembers")
      .leftJoin("teamRoles", "teamRoles.id", "teamMembers.roleId")
      .select(["teamMembers.id", "teamMembers.email", "teamMembers.displayName", "teamMembers.roleId", "teamMembers.status", "teamMembers.createdAt", "teamRoles.name as roleName"])
      .where("teamMembers.businessId", "=", business.id)
      .orderBy("teamMembers.createdAt")
      .execute();

    const output: OutputType = {
      enabled,
      ownerEmail: user.email,
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: Array.isArray(r.permissions) ? r.permissions.filter((p): p is string => typeof p === "string") : [],
        isSystem: r.isSystem,
        memberCount: members.filter((m) => m.roleId === r.id).length,
      })),
      members: members.map((m) => ({ id: m.id, email: m.email, displayName: m.displayName, roleId: m.roleId, roleName: m.roleName, status: m.status, createdAt: m.createdAt })),
    };
    return new Response(superjson.stringify(output), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    return new Response(superjson.stringify({ error: msg === "NO_BUSINESS" ? "Create your business page first." : "Not allowed" }), { status: msg === "NO_BUSINESS" ? 400 : 401 });
  }
}
   51