import superjson from "superjson";
import { portfolioSettings } from "../helpers/portfolioSettings";

export async function handle() {
  try {
    const portfolio = await portfolioSettings.load();
    return new Response(superjson.stringify({ portfolio }), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=15" } });
  } catch {
    return new Response(superjson.stringify({ error: "Could not load this portfolio." }), { status: 500 });
  }
}
