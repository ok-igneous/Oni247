import superjson from "superjson";
import { db } from "../../helpers/db";
import { schema, type OutputType } from "./enquiry_POST.schema";

/** Cheap flood guard: one business cannot be given more than this in an hour. */
const MAX_ENQUIRIES_PER_HOUR = 30;

export async function handle(request: Request) {
  try {
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    const business = await db
      .selectFrom("businesses")
      .select(["id"])
      .where("slug", "=", input.slug)
      .where("status", "=", "published")
      .limit(1)
      .executeTakeFirst();

    if (!business) {
      return new Response(
        superjson.stringify({ error: "This business page was not found." }),
        { status: 404 },
      );
    }

    const recent = await db
      .selectFrom("enquiries")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .where("businessId", "=", business.id)
      .where("createdAt", ">", new Date(Date.now() - 60 * 60 * 1000))
      .executeTakeFirstOrThrow();

    if (Number(recent.count) >= MAX_ENQUIRIES_PER_HOUR) {
      return new Response(
        superjson.stringify({
          error: "Too many messages right now. Please try again later.",
        }),
        { status: 429 },
      );
    }

    await db
      .insertInto("enquiries")
      .values({
        businessId: business.id,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        message: input.message,
        status: "new",
      })
      .executeTakeFirstOrThrow();

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
