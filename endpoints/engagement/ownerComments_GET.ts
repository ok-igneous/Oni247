import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OutputType, OwnerComment } from "./ownerComments_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);

    const rows = await db
      .selectFrom("comments as c")
      .leftJoin("reactions as r", (join) =>
        join.onRef("r.targetId", "=", "c.id").on("r.targetType", "=", "comment"),
      )
      .select(["c.id", "c.targetType", "c.targetId", "c.authorName", "c.body", "c.status", "c.createdAt"])
      .select(sql<string>`count(r.id)`.as("likeCount"))
      .where("c.businessId", "=", business.id)
      .groupBy("c.id")
      .orderBy("c.createdAt", "desc")
      .limit(500)
      .execute();

    // Resolve a readable title for what each comment is attached to.
    const idsFor = (type: string) =>
      [...new Set(rows.filter((row) => row.targetType === type).map((row) => row.targetId))];
    const titles = new Map<string, string>();
    const blogIds = idsFor("blog");
    const productIds = idsFor("product");
    const eventIds = idsFor("event");
    const galleryIds = idsFor("gallery");
    if (blogIds.length) {
      (await db.selectFrom("blogPosts").select(["id", "title"]).where("id", "in", blogIds).execute())
        .forEach((row) => titles.set(row.id, row.title));
    }
    if (productIds.length) {
      (await db.selectFrom("products").select(["id", "name"]).where("id", "in", productIds).execute())
        .forEach((row) => titles.set(row.id, row.name));
    }
    if (eventIds.length) {
      (await db.selectFrom("events").select(["id", "title"]).where("id", "in", eventIds).execute())
        .forEach((row) => titles.set(row.id, row.title));
    }
    if (galleryIds.length) {
      (await db.selectFrom("galleries").select(["id", "name"]).where("id", "in", galleryIds).execute())
        .forEach((row) => titles.set(row.id, row.name));
    }

    const comments: OwnerComment[] = rows.map((row) => ({
      id: row.id,
      targetType: row.targetType as OwnerComment["targetType"],
      targetId: row.targetId,
      targetTitle: titles.get(row.targetId) ?? "Removed item",
      authorName: row.authorName,
      body: row.body,
      status: row.status as OwnerComment["status"],
      createdAt: row.createdAt,
      likeCount: Number(row.likeCount),
    }));

    return new Response(superjson.stringify({ comments } satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(superjson.stringify({ error: "Please sign in to see your comments." }), {
      status: 401,
    });
  }
}
