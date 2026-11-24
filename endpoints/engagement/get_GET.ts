import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { parseEngagementSettings, REACTION_KINDS, type ReactionKind } from "../../helpers/parseEngagementSettings";
import { schema, type OutputType, type PublicComment } from "./get_GET.schema";

type Target = "blog" | "product" | "event" | "gallery";

/** Confirms the thing being discussed exists, is public, and belongs to this business. */
export const loadTarget = async (
  businessId: string,
  targetType: Target,
  targetId: string,
): Promise<{ commentsOverride: boolean | null; reactionsOverride: boolean | null } | null> => {
  if (targetType === "blog") {
    const row = await db
      .selectFrom("blogPosts")
      .select(["commentsEnabled", "reactionsEnabled"])
      .where("id", "=", targetId)
      .where("businessId", "=", businessId)
      .where("published", "=", true)
      .executeTakeFirst();
    return row
      ? { commentsOverride: row.commentsEnabled, reactionsOverride: row.reactionsEnabled }
      : null;
  }
  const table =
    targetType === "product" ? "products" : targetType === "event" ? "events" : "galleries";
  let query = db
    .selectFrom(table)
    .select("id")
    .where("id", "=", targetId)
    .where("businessId", "=", businessId);
  if (targetType === "event" || targetType === "gallery") {
    query = query.where("published" as never, "=", true as never);
  }
  const row = await query.executeTakeFirst();
  return row ? { commentsOverride: null, reactionsOverride: null } : null;
};

export async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    const input = schema.parse({
      slug: url.searchParams.get("slug") ?? "",
      targetType: url.searchParams.get("targetType") ?? "",
      targetId: url.searchParams.get("targetId") ?? "",
      visitorKey: url.searchParams.get("visitorKey") ?? "",
      order: url.searchParams.get("order") ?? undefined,
      limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
      offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : undefined,
    });

    const business = await db
      .selectFrom("businesses")
      .select(["id", "engagementSettings"])
      .where("slug", "=", input.slug)
      .where("status", "=", "published")
      .executeTakeFirst();
    if (!business) {
      return new Response(superjson.stringify({ error: "This page was not found." }), { status: 404 });
    }

    const target = await loadTarget(business.id, input.targetType, input.targetId);
    if (!target) {
      return new Response(superjson.stringify({ error: "This item was not found." }), { status: 404 });
    }

    const settings = parseEngagementSettings(business.engagementSettings);
    const commentsEnabled = target.commentsOverride ?? settings.comments[input.targetType];
    const reactionsEnabled = target.reactionsOverride ?? settings.reactions[input.targetType];
    const order = input.order ?? settings.defaultOrder;
    const limit = input.limit ?? settings.initialCount;
    const offset = input.offset ?? 0;

    // Reactions on the thing itself.
    const counts: Record<ReactionKind, number> = { like: 0, love: 0, clap: 0, wow: 0 };
    let mine: ReactionKind | null = null;
    if (reactionsEnabled) {
      const rows = await db
        .selectFrom("reactions")
        .select(["kind", sql<string>`count(*)`.as("total")])
        .where("targetType", "=", input.targetType)
        .where("targetId", "=", input.targetId)
        .groupBy("kind")
        .execute();
      for (const row of rows) {
        if ((REACTION_KINDS as string[]).includes(row.kind)) {
          counts[row.kind as ReactionKind] = Number(row.total);
        }
      }
      const own = await db
        .selectFrom("reactions")
        .select("kind")
        .where("targetType", "=", input.targetType)
        .where("targetId", "=", input.targetId)
        .where("visitorKey", "=", input.visitorKey)
        .executeTakeFirst();
      mine = own && (REACTION_KINDS as string[]).includes(own.kind) ? (own.kind as ReactionKind) : null;
    }

    // Comments.
    let items: PublicComment[] = [];
    let total = 0;
    if (commentsEnabled) {
      const totalRow = await db
        .selectFrom("comments")
        .select(sql<string>`count(*)`.as("total"))
        .where("businessId", "=", business.id)
        .where("targetType", "=", input.targetType)
        .where("targetId", "=", input.targetId)
        .where("status", "=", "approved")
        .executeTakeFirst();
      total = Number(totalRow?.total ?? 0);

      const rows = await db
        .selectFrom("comments as c")
        .leftJoin("reactions as r", (join) =>
          join.onRef("r.targetId", "=", "c.id").on("r.targetType", "=", "comment"),
        )
        .select(["c.id", "c.authorName", "c.body", "c.createdAt"])
        .select(sql<string>`count(r.id)`.as("likeCount"))
        .where("c.businessId", "=", business.id)
        .where("c.targetType", "=", input.targetType)
        .where("c.targetId", "=", input.targetId)
        .where("c.status", "=", "approved")
        .groupBy("c.id")
        .orderBy(
          order === "popular"
            ? sql`count(r.id) desc, c.created_at desc`
            : sql`c.created_at desc`,
        )
        .limit(limit)
        .offset(offset)
        .execute();

      const ids = rows.map((row) => row.id);
      const liked = new Set<string>();
      if (ids.length > 0) {
        const mineRows = await db
          .selectFrom("reactions")
          .select("targetId")
          .where("targetType", "=", "comment")
          .where("visitorKey", "=", input.visitorKey)
          .where("targetId", "in", ids)
          .execute();
        mineRows.forEach((row) => liked.add(row.targetId));
      }

      items = rows.map((row) => ({
        id: row.id,
        authorName: row.authorName,
        body: row.body,
        createdAt: row.createdAt,
        likeCount: Number(row.likeCount),
        likedByMe: liked.has(row.id),
      }));
    }

    const output: OutputType = {
      config: {
        commentsEnabled,
        reactionsEnabled,
        reactionStyle: settings.reactionStyle,
        defaultOrder: settings.defaultOrder,
        initialCount: settings.initialCount,
        moderation: settings.moderation,
      },
      reactions: {
        counts,
        total: Object.values(counts).reduce((sum, value) => sum + value, 0),
        mine,
      },
      comments: { items, total, hasMore: offset + items.length < total },
    };

    return new Response(superjson.stringify(output), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load comments.";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}
