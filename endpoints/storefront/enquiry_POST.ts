import superjson from "superjson";
import { db } from "../../helpers/db";
import { sql } from "kysely";
import { schema, type OutputType } from "./enquiry_POST.schema";

/** Cheap flood guard: one business cannot be given more than this in an hour. */
const MAX_ENQUIRIES_PER_HOUR = 30;

export async function handle(request: Request) {
  try {
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    const result = await sql<{ outcome: string }>`select app_private.submit_public_enquiry(
      ${input.slug}, ${input.customerName}, ${input.customerPhone},
      ${input.customerEmail}, ${input.message}
    ) as outcome`.execute(db);
    const outcome = result.rows[0]?.outcome;
    if (outcome === "not_found") {
      return new Response(
        superjson.stringify({ error: "This business page was not found." }),
        { status: 404 },
      );
    }
    if (outcome === "rate_limited") {
      return new Response(
        superjson.stringify({
          error: "Too many messages right now. Please try again later.",
        }),
        { status: 429 },
      );
    }
    if (outcome !== "created") {
      throw new Error("Could not send your message.");
    }

    return new Response(
      superjson.stringify({ sent: true } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send your message.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}
