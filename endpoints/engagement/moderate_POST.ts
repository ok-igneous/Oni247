import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { schema, type OutputType } from "./moderate_POST.schema";

export async function handle(request: Request) {
  let businessId: string;
  try {
    businessId = (await requireOwnedBusiness(request)).business.id;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), { status: 401 });
  }

  try {
    const input = schema.parse(superjson.parse(await request.text()));

    if (input.action === "delete") {
      // Likes on a deleted comment go with it.
      await db
        .deleteFrom("reactions")
        .where("businessId", "=", businessId)
        .where("targetType", "=", "comment")
        .where("targetId", "in", input.ids)
        .execute();
      const result = await db
        .deleteFrom("comments")
        .where("businessId", "=", businessId)
        .where("id", "in", input.ids)
        .executeTakeFirst();
      return new Response(
        superjson.stringify({ updated: Number(result.numDeletedRows ?? 0) } satisfies OutputType),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await db
      .updateTable("comments")
      .set({ status: input.action === "approve" ? "approved" : "hidden" })
      .where("businessId", "=", businessId)
      .where("id", "in", input.ids)
      .executeTakeFirst();
    return new Response(
      superjson.stringify({ updated: Number(result.numUpdatedRows ?? 0) } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the comments.";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}
