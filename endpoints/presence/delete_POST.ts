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

    // Deleting is allowed on any plan — a lapsed shop must still be able to
    // take down content it no longer wants shown.
    const result =
      input.kind === "testimonial"
        ? await db
            .deleteFrom("testimonials")
            .where("id", "=", input.id)
            .where("businessId", "=", businessId)
            .executeTakeFirst()
        : await db
            .deleteFrom("portfolioItems")
            .where("id", "=", input.id)
            .where("businessId", "=", businessId)
            .executeTakeFirst();

    if (Number(result.numDeletedRows ?? 0) === 0) {
      return new Response(superjson.stringify({ error: "Not found." }), {
        status: 404,
      });
    }

    return new Response(
      superjson.stringify({ deleted: true } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}
