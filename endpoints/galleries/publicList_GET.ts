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

    // Fetch every gallery's images in one query instead of issuing one query per gallery.
    const galleryIds = rows.map((gallery) => gallery.id);
    const images = galleryIds.length
      ? await db
          .selectFrom("galleryImages")
          .select(["id", "galleryId", "imageUrl"])
          .where("galleryId", "in", galleryIds)
          .orderBy("sortOrder", "asc")
          .orderBy("createdAt", "asc")
          .execute()
      : [];

    const imagesByGallery = new Map<string, typeof images>();
    for (const image of images) {
      const group = imagesByGallery.get(image.galleryId) ?? [];
      group.push(image);
      imagesByGallery.set(image.galleryId, group);
    }

    const galleries = rows.map((gallery) => {
      const galleryImages = imagesByGallery.get(gallery.id) ?? [];
      return {
        ...gallery,
        coverImageUrl: gallery.coverImageUrl ?? galleryImages[0]?.imageUrl ?? null,
        imageCount: galleryImages.length,
      };
    });

    return new Response(superjson.stringify({ galleries }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("galleries/publicList failed:", error);
    return new Response(superjson.stringify({ error: "Could not load galleries." }), { status: 500 });
  }
}
