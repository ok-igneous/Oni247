import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { loadPlanConfig } from "../../helpers/planConfig";
import { sanitizeBlogContent } from "../../helpers/sanitizeBlogContent";
import type { InputType } from "./save_POST.schema";

/**
 * Finds a slug nobody else in this business is using. "my-post" becomes
 * "my-post-2", "my-post-3" and so on, so saving never fails on a clash.
 */
const uniqueSlug = async (
  businessId: string,
  wanted: string,
  ignoreId: string | null,
): Promise<string> => {
  const rows = await db
    .selectFrom("blogPosts")
    .select(["id", "slug"])
    .where("businessId", "=", businessId)
    .where("slug", "like", `${wanted}%`)
    .execute();
  const taken = new Set(
    rows.filter((row) => row.id !== ignoreId).map((row) => row.slug),
  );
  if (!taken.has(wanted)) return wanted;
  for (let n = 2; n < 500; n += 1) {
    const candidate = `${wanted}-${n}`.slice(0, 160);
    if (!taken.has(candidate)) return candidate;
  }
  return `${wanted}-${Date.now().toString(36)}`.slice(0, 160);
};

export async function handle(request: Request) {
  let business;
  try {
    business = (await requireOwnedBusiness(request)).business;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }
  await loadPlanConfig();
  if (!subscriptionPlan.resolve(business).isPremium) {
    return new Response(
      superjson.stringify({ error: "Blog editing is available on Premium plans." }),
      { status: 402 },
    );
  }

  try {
    const input = superjson.parse<InputType>(await request.text());
    const content = sanitizeBlogContent(input.content);

    if (input.id) {
      const existing = await db
        .selectFrom("blogPosts")
        .select(["id", "published", "publishedAt"])
        .where("id", "=", input.id)
        .where("businessId", "=", business.id)
        .executeTakeFirst();
      if (!existing) {
        return new Response(superjson.stringify({ error: "Post not found." }), {
          status: 404,
        });
      }
      const slug = await uniqueSlug(business.id, input.slug, input.id);
      await db
        .updateTable("blogPosts")
        .set({
          title: input.title,
          slug,
          excerpt: input.excerpt,
          coverImageUrl: input.coverImageUrl,
          content,
          published: input.published,
          ...(input.commentsEnabled !== undefined ? { commentsEnabled: input.commentsEnabled } : {}),
          ...(input.reactionsEnabled !== undefined ? { reactionsEnabled: input.reactionsEnabled } : {}),
          // Keep the original publish date when an already-published post is edited.
          publishedAt: input.published ? (existing.publishedAt ?? new Date()) : null,
          updatedAt: new Date(),
        })
        .where("id", "=", input.id)
        .where("businessId", "=", business.id)
        .execute();
    } else {
      const slug = await uniqueSlug(business.id, input.slug, null);
      await db
        .insertInto("blogPosts")
        .values({
          businessId: business.id,
          title: input.title,
          slug,
          excerpt: input.excerpt,
          coverImageUrl: input.coverImageUrl,
          content,
          published: input.published,
          commentsEnabled: input.commentsEnabled ?? null,
          reactionsEnabled: input.reactionsEnabled ?? null,
          publishedAt: input.published ? new Date() : null,
        })
        .execute();
    }

    return new Response(superjson.stringify({ saved: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    // A race between two saves can still hit the unique index; say it plainly.
    const friendly = message.includes("blog_posts_business_slug_unique")
      ? "Another post already uses that page address. Change the address and save again."
      : message || "Could not save the post.";
    return new Response(superjson.stringify({ error: friendly }), { status: 400 });
  }
}
  116