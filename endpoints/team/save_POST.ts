import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { isAddonEnabled } from "../../helpers/addons";
import { isPermission } from "../../helpers/permissions";
import { emailSendingReady } from "../../helpers/emailConfig";
import { sendViaSmtp } from "../../helpers/smtpSend";
import type { Json } from "../../helpers/schema";
import { schema, type OutputType } from "./save_POST.schema";

const fail = (error: string, status = 400) => new Response(superjson.stringify({ error }), { status });
const ok = (message: string) => new Response(superjson.stringify({ ok: true, message } satisfies OutputType), { headers: { "Content-Type": "application/json" } });

export async function handle(request: Request) {
  let ctx;
  try {
    ctx = await requireOwnedBusiness(request);
  } catch {
    return fail("Not allowed", 401);
  }
  const { business, user } = ctx;
  try {
    if (!isAddonEnabled((business.appearanceSettings ?? {}) as Record<string, unknown>, "team")) return fail("Switch on the Team add-on first.", 403);
    const input = schema.parse(superjson.parse(await request.text()));

    switch (input.op) {
      case "role.save": {
        const permissions = [...new Set(input.permissions.filter(isPermission))];
        if (input.id) {
          const done = await db
            .updateTable("teamRoles")
            .set({ name: input.name, description: input.description, permissions: permissions as unknown as Json, updatedAt: new Date() })
            .where("id", "=", input.id)
            .where("businessId", "=", business.id)
            .executeTakeFirst();
          if (!done.numUpdatedRows) return fail("Role not found.", 404);
          return ok("Role saved.");
        }
        await db.insertInto("teamRoles").values({ businessId: business.id, name: input.name, description: input.description, permissions: permissions as unknown as Json }).execute();
        return ok("Role created.");
      }
      case "role.delete": {
        const role = await db.selectFrom("teamRoles").select(["id", "isSystem"]).where("id", "=", input.id).where("businessId", "=", business.id).executeTakeFirst();
        if (!role) return fail("Role not found.", 404);
        if (role.isSystem) return fail("The standard roles cannot be deleted. Change their permissions instead.");
        const used = await db.selectFrom("teamMembers").select("id").where("roleId", "=", role.id).limit(1).executeTakeFirst();
        if (used) return fail("Move the people in this role to another role first.");
        await db.deleteFrom("teamRoles").where("id", "=", role.id).execute();
        return ok("Role deleted.");
      }
      case "member.save": {
        const email = input.email.toLowerCase();
        if (email === user.email.toLowerCase()) return fail("That is your own email. You already have full access.");
        const role = await db.selectFrom("teamRoles").select(["id", "name"]).where("id", "=", input.roleId).where("businessId", "=", business.id).executeTakeFirst();
        if (!role) return fail("Choose a role.");
        if (input.id) {
          const done = await db
            .updateTable("teamMembers")
            .set({ displayName: input.displayName, roleId: role.id, updatedAt: new Date() })
            .where("id", "=", input.id)
            .where("businessId", "=", business.id)
            .executeTakeFirst();
          if (!done.numUpdatedRows) return fail("Person not found.", 404);
          return ok("Saved.");
        }
        const taken = await db.selectFrom("teamMembers").select("id").where("businessId", "=", business.id).where("email", "=", email).executeTakeFirst();
        if (taken) return fail("That email is already on your team.");
        const known = await db.selectFrom("users").select("id").where("email", "=", email).executeTakeFirst();
        await db.insertInto("teamMembers").values({ businessId: business.id, email, displayName: input.displayName, roleId: role.id, userId: known?.id ?? null, status: known ? "active" : "invited" }).execute();
        let mailed = false;
        try {
          if (await emailSendingReady()) {
            const origin = new URL(request.url).origin;
            const link = `${origin}/${known ? "login" : "register"}`;
            const text = `${user.displayName || "The owner"} added you to the team at ${business.name} on Oni247 as ${role.name}.\n\n${known ? "Sign in" : "Create your account with this email address"} to get started: ${link}`;
            const [res] = await sendViaSmtp([{ fromName: business.name, to: email, subject: `You have been added to ${business.name}`, text, html: `<p style="font-family:Arial,sans-serif;line-height:1.6">${text.replace(/\n\n/g, "</p><p style=\"font-family:Arial,sans-serif;line-height:1.6\">").replace(link, `<a href="${link}">${link}</a>`)}</p>` }]);
            mailed = res.ok;
          }
        } catch {
          mailed = false;
        }
        return ok(mailed ? "Added. They have been emailed." : known ? "Added. They can sign in now." : "Added. Ask them to register with this email address to get access.");
      }
      case "member.status": {
        const done = await db.updateTable("teamMembers").set({ status: input.disabled ? "disabled" : "active", updatedAt: new Date() }).where("id", "=", input.id).where("businessId", "=", business.id).executeTakeFirst();
        if (!done.numUpdatedRows) return fail("Person not found.", 404);
        return ok(input.disabled ? "Access paused." : "Access restored.");
      }
      case "member.remove": {
        await db.deleteFrom("teamMembers").where("id", "=", input.id).where("businessId", "=", business.id).execute();
        return ok("Removed from your team.");
      }
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not save that.");
  }
}

