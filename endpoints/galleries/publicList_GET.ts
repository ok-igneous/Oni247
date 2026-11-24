import superjson from "superjson";
import { db } from "../../helpers/db";

export async function handle(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("slug") ?? "";
    const business = await db
      .selectFrom("businesses")
      .select(["id"])
      .where("slug", "=", slug)
      .where("status", "=", "published")
      .executeTakeFirst();
    if (!business) {
      return new Response(superjson.stringify({ error: "Not found" }), { status: 404 });
    }

    const rows = await db
      .selectFrom("galleries")
      .selectAll()
      .where("businessId", "=", business.id)
      .where("published", "=", true)
      .orderBy("sortOrder", "asc")
      .orderBy("createdAt", "asc")
      .execute();

    const galleries = [];
    for (const row of rows) {
      const images = await db
        .selectFrom("galleryImages")
        .select(["id", "imageUrl"])
        .where("galleryId", "=", row.id)
        .orderBy("sortOrder", "asc")
        .orderBy("createdAt", "asc")
        .execute();
      galleries.push({
        ...row,
        coverImageUrl: row.coverImageUrl ?? images[0]?.imageUrl ?? null,
        imageCount: images.length,
      });
    }

    return new Response(superjson.stringify({ galleries }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("galleries/publicList failed:", error);
    return new Response(superjson.stringify({ error: "Could not load galleries." }), { status: 500 });
  }
}

