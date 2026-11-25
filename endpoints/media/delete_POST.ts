import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { schema } from "./delete_POST.schema";

/** Deletes one library picture that belongs to the signed-in owner. */
export async function handle(request: Request) {
  let businessId: string;
  try {
    businessId = (await requireOwnedBusiness(request)).business.id;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), { status: 401 });
  }
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const asset = await db.selectFrom("mediaAssets").select(["id", "fileUrl"]).where("id", "=", input.id).where("businessId", "=", businessId).executeTakeFirst();
    if (!asset) return new Response(superjson.stringify({ error: "That picture is no longer in your library." }), { status: 404 });

    if (!input.force) {
      const url = asset.fileUrl;
      const like = `%${url}%`;
      const used = await sql<{ n: number }>`select (
        (select count(*) from businesses where id = ${businessId}::uuid and (logo_url = ${url} or hero_image_url = ${url} or appearance_settings::text like ${like} or content_settings::text like ${like})) +
        (select count(*) from products where business_id = ${businessId}::uuid and (image_url = ${url} or images::text like ${like})) +
        (select count(*) from galleries where business_id = ${businessId}::uuid and cover_image_url = ${url}) +
        (select count(*) from gallery_images gi join galleries g on g.id = gi.gallery_id where g.business_id = ${businessId}::uuid and gi.image_url = ${url}) +
        (select count(*) from events where business_id = ${businessId}::uuid and cover_image_url = ${url}) +
        (select count(*) from blog_posts where business_id = ${businessId}::uuid and (cover_image_url = ${url} or content like ${like})) +
        (select count(*) from portfolio_items where business_id = ${businessId}::uuid and image_url = ${url}) +
        (select count(*) from testimonials where business_id = ${businessId}::uuid and image_url = ${url})
      )::int as n`.execute(db);
      if (Number(used.rows[0]?.n ?? 0) > 0) return new Response(superjson.stringify({ error: "IN_USE" }), { status: 409 });
    }

    await db.deleteFrom("mediaAssets").where("id", "=", asset.id).where("businessId", "=", businessId).execute();
    return new Response(superjson.stringify({ deleted: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(superjson.stringify({ error: error instanceof Error ? error.message : "Could not delete the picture." }), { status: 400 });
  }
}

