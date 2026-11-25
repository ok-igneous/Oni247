import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { parseEngagementSettings } from "../../helpers/parseEngagementSettings";
import { loadTarget } from "./get_GET";
import { schema, type OutputType } from "./comment_POST.schema";

const fail = (message: string, status = 400) =>
  new Response(superjson.stringify({ error: message }), { status });

export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));

    // Bots fill the hidden field; pretend it worked.
    if (input.website && input.website.trim() !== "") {
      return new Response(
        superjson.stringify({ status: "pending", message: "Thanks! Your comment is waiting for approval." } satisfies OutputType),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const business = await db
      .selectFrom("businesses")
      .select(["id", "engagementSettings"])
      .where("slug", "=", input.slug)
      .where("status", "=", "published")
      .executeTakeFirst();
    if (!business) return fail("This page was not found.", 404);

    const target = await loadTarget(business.id, input.targetType, input.targetId);
    if (!target) return fail("This item was not found.", 404);

    const settings = parseEngagementSettings(business.engagementSettings);
    const enabled = target.commentsOverride ?? settings.comments[input.targetType];
    if (!enabled) return fail("Comments are turned off here.", 403);

    // Same person, same words, last day: almost certainly a double tap.
    const duplicate = await db
      .selectFrom("comments")
      .select("id")
      .where("businessId", "=", business.id)
      .where("targetId", "=", input.targetId)
      .where("authorName", "=", input.authorName)
      .where("body", "=", input.body)
      .where("createdAt", ">", sql<Date>`now() - interval '1 day'`)
      .executeTakeFirst();
    if (duplicate) return fail("You have already posted that comment.");

    // Burst limit per name and page.
    const recent = await db
      .selectFrom("comments")
      .select(sql<string>`count(*)`.as("total"))
      .where("businessId", "=", business.id)
      .where("targetId", "=", input.targetId)
      .where("authorName", "=", input.authorName)
      .where("createdAt", ">", sql<Date>`now() - interval '10 minutes'`)
      .executeTakeFirst();
    if (Number(recent?.total ?? 0) >= 3) {
      return fail("You are commenting quickly. Please wait a few minutes and try again.", 429);
    }

    // Comments stuffed with links go to the owner first, whatever the setting.
    const links = (input.body.match(/https?:\/\/|www\./gi) ?? []).length;
    const status: "approved" | "pending" =
      settings.moderation === "manual" || links > 2 ? "pending" : "approved";

    await db
      .insertInto("comments")
      .values({
        businessId: business.id,
        targetType: input.targetType,
        targetId: input.targetId,
        authorName: input.authorName,
        body: input.body,
        status,
      })
      .execute();

    return new Response(
      superjson.stringify({
        status,
        message:
          status === "approved"
            ? "Thanks! Your comment is now live."
            : "Thanks! Your comment will appear once the owner approves it.",
      } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not post your comment.";
    return fail(message);
  }
}
