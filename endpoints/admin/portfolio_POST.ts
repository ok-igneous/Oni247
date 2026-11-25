import superjson from "superjson";
import { requireAdmin } from "../../helpers/requireAdmin";
import { portfolioSettings } from "../../helpers/portfolioSettings";
import { schema, type OutputType } from "./portfolio_POST.schema";

export async function handle(request: Request) {
  try { await requireAdmin(request); } catch { return new Response(superjson.stringify({ error: "Not allowed" }), { status: 403 }); }
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    await portfolioSettings.save(input.portfolio);
    return new Response(superjson.stringify({ ok: true } satisfies OutputType), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    return new Response(superjson.stringify({ error: error instanceof Error ? error.message : "Could not save portfolio." }), { status: 400 });
  }
}
