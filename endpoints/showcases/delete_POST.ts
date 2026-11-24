import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { schema, type OutputType } from "./delete_POST.schema";

export async function handle(request: Request) {
  let businessId: string;
  try {
    const { business } = await requireOwnedBusiness(request);
    businessId = business.id;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  try {
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    const result = await db
      .deleteFrom("showcases")
      .where("id", "=", input.id)
      .where("businessId", "=", businessId)
      .executeTakeFirst();

    if (Number(result.numDeletedRows ?? 0) === 0) {
      return new Response(
        superjson.stringify({ error: "Collection not found." }),
        { status: 404 },
      );
    }

    return new Response(
      superjson.stringify({ deleted: true } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete the collection.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}
