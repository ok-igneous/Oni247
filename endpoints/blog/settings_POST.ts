import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { parseBlogSettings } from "../../helpers/parseBlogSettings";
import { schema, type OutputType } from "./settings_POST.schema";

export async function handle(request: Request) {
  let businessId: string;
  try {
    businessId = (await requireOwnedBusiness(request)).business.id;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), { status: 401 });
  }
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const settings = parseBlogSettings(input);
    await db
      .updateTable("businesses")
      .set({ blogSettings: settings, updatedAt: new Date() })
      .where("id", "=", businessId)
      .execute();
    return new Response(superjson.stringify({ settings } satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the blog settings.";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}
