import superjson from "superjson";
import { db } from "../../helpers/db";
import { parseEngagementSettings } from "../../helpers/parseEngagementSettings";
import { loadTarget } from "./get_GET";
import { schema, type OutputType } from "./react_POST.schema";

const fail = (message: string, status = 400) =>
  new Response(superjson.stringify({ error: message }), { status });

export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));

    const business = await db
      .selectFrom("businesses")
      .select(["id", "engagementSettings"])
      .where("slug", "=", input.slug)
      .where("status", "=", "published")
      .executeTakeFirst();
    if (!business) return fail("This page was not found.", 404);

    const settings = parseEngagementSettings(business.engagementSettings);

    if (input.targetType === "comment") {
      // Liking a comment: it must be a visible comment of this business.
      const comment = await db
        .selectFrom("comments")
        .select("id")
        .where("id", "=", input.targetId)
        .where("businessId", "=", business.id)
        .where("status", "=", "approved")
        .executeTakeFirst();
      if (!comment) return fail("This comment was not found.", 404);
    } else {
      const target = await loadTarget(business.id, input.targetType, input.targetId);
      if (!target) return fail("This item was not found.", 404);
      const enabled = target.reactionsOverride ?? settings.reactions[input.targetType];
      if (!enabled) return fail("Reactions are turned off here.", 403);
    }

    if (input.kind === null) {
      await db
        .deleteFrom("reactions")
        .where("targetType", "=", input.targetType)
        .where("targetId", "=", input.targetId)
        .where("visitorKey", "=", input.visitorKey)
        .execute();
    } else {
      // With "like only", other kinds are refused so counts stay meaningful.
      if (settings.reactionStyle === "like" && input.kind !== "like") {
        return fail("Only likes are enabled here.");
      }
      await db
        .insertInto("reactions")
        .values({
          businessId: business.id,
          targetType: input.targetType,
          targetId: input.targetId,
          visitorKey: input.visitorKey,
          kind: input.kind,
        })
        .onConflict((oc) =>
          oc.columns(["targetType", "targetId", "visitorKey"]).doUpdateSet({ kind: input.kind as string }),
        )
        .execute();
    }

    return new Response(superjson.stringify({ saved: true } satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save your reaction.";
    return fail(message);
  }
}
