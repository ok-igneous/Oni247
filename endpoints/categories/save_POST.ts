import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { schema, type OutputType } from "./save_POST.schema";

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

    const values = {
      name: input.name,
      description: input.description,
      sortOrder: input.sortOrder,
    };

    // On update the businessId filter is what enforces isolation: an id
    // belonging to another shop simply matches no row.
    const category = input.id
      ? await db
          .updateTable("categories")
          .set({ ...values, updatedAt: new Date() })
          .where("id", "=", input.id)
          .where("businessId", "=", businessId)
          .returningAll()
          .executeTakeFirst()
      : await db
          .insertInto("categories")
          .values({ ...values, businessId })
          .returningAll()
          .executeTakeFirstOrThrow();

    if (!category) {
      return new Response(
        superjson.stringify({ error: "Category not found." }),
        { status: 404 },
      );
    }

    return new Response(
      superjson.stringify({ category } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save the category.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}
