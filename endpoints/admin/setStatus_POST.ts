import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireAdmin } from "../../helpers/requireAdmin";
import { schema, type OutputType } from "./setStatus_POST.schema";

/**
 * Suspend or restore a shop. Suspending only hides the public page — the
 * owner keeps their dashboard and every row of their data.
 */
export async function handle(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    const notAdmin = error instanceof Error && error.message === "NOT_ADMIN";
    return new Response(
      superjson.stringify({
        error: notAdmin ? "Administrator access required." : "Not authenticated",
      }),
      { status: notAdmin ? 403 : 401 },
    );
  }

  try {
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    const result = await db
      .updateTable("businesses")
      .set({ status: input.status, updatedAt: new Date() })
      .where("id", "=", input.businessId)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows ?? 0) === 0) {
      return new Response(
        superjson.stringify({ error: "Business not found." }),
        { status: 404 },
      );
    }

    return new Response(
      superjson.stringify({ updated: true } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update the business.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}
