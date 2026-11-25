import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    if (!subscriptionPlan.resolve(business).isPremium) {
      return new Response(
        superjson.stringify({ error: "Blog editing is available on Premium plans." }),
        { status: 402 },
      );
    }
    const { id } = JSON.parse(await request.text()) as { id: string };

    await db.transaction().execute(async (trx) => {
      // Take the post's comments, and the likes on them, away with it.
      const comments = await trx
        .selectFrom("comments")
        .select("id")
        .where("businessId", "=", business.id)
        .where("targetType", "=", "blog")
        .where("targetId", "=", id)
        .execute();
      if (comments.length > 0) {
        await trx
          .deleteFrom("reactions")
          .where("targetType", "=", "comment")
          .where("targetId", "in", comments.map((row) => row.id))
          .execute();
      }
      await trx
        .deleteFrom("comments")
        .where("businessId", "=", business.id)
        .where("targetType", "=", "blog")
        .where("targetId", "=", id)
        .execute();
      await trx
        .deleteFrom("reactions")
        .where("businessId", "=", business.id)
        .where("targetType", "=", "blog")
        .where("targetId", "=", id)
        .execute();
      await trx
        .deleteFrom("blogPosts")
        .where("id", "=", id)
        .where("businessId", "=", business.id)
        .execute();
    });

    return new Response(superjson.stringify({ deleted: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(superjson.stringify({ error: "Could not delete the post." }), { status: 400 });
  }
}
