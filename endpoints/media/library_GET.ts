import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OutputType } from "./library_GET.schema";

/**
 * Images the owner already uploaded, for the "pick from library" option in any
 * image picker. Available on every plan (the full Media Library page stays Premium Plus).
 */
export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    const rows = await db
      .selectFrom("mediaAssets")
      .select(["id", "kind", "fileUrl", "contentType", "sizeBytes", "createdAt"])
      .where("businessId", "=", business.id)
      .where("contentType", "like", "image/%")
      .orderBy("createdAt", "desc")
      .limit(200)
      .execute();

    const images = rows.map((row) => ({
      ...row,
      sizeBytes: Number(row.sizeBytes),
    }));

    return new Response(superjson.stringify({ images } satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      superjson.stringify({ error: "Please sign in to use your media library." }),
      { status: 401 },
    );
  }
}
