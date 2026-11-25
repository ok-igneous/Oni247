import superjson from "superjson";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import type { OutputType } from "./me_GET.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

    const business = await db
      .selectFrom("businesses")
      .selectAll()
      .where("ownerId", "=", user.id)
      .limit(1)
      .executeTakeFirst();

    return new Response(
      superjson.stringify({ business: business ?? null } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not authenticated";
    return new Response(superjson.stringify({ error: message }), {
      status: 401,
    });
  }
}
