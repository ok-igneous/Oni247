import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { schema, type OutputType } from "./notes_POST.schema";

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
    const input = schema.parse(superjson.parse(await request.text()));
    const result = await db
      .updateTable("customers")
      .set({ notes: input.notes, updatedAt: new Date() })
      .where("id", "=", input.id)
      .where("businessId", "=", businessId)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows ?? 0) === 0) {
      return new Response(superjson.stringify({ error: "Customer not found." }), {
        status: 404,
      });
    }
    return new Response(
      superjson.stringify({ updated: true } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save the note.";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}
