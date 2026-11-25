import superjson from "superjson";
import { requireAdmin } from "../../helpers/requireAdmin";
import { platformSettings } from "../../helpers/platformSettings";
import { DEFAULT_LANDING, LANDING_KEY, mergeLanding } from "../../helpers/landingConfig";
import { schema, type OutputType } from "./landing_POST.schema";

const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });

export async function handle(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return fail("Not allowed", 403);
  }
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    if (input.op === "reset") {
      await platformSettings.set(LANDING_KEY, null);
      return new Response(superjson.stringify({ ok: true, landing: DEFAULT_LANDING } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
    }
    // Everything is cleaned on the server: colours, icons, lengths. The browser's copy is never trusted.
    const landing = mergeLanding(input.landing);
    await platformSettings.set(LANDING_KEY, landing);
    return new Response(superjson.stringify({ ok: true, landing } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not save the landing page.", 400);
  }
}
