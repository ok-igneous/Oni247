import superjson from "superjson";
import { db } from "../../helpers/db";
import { schema } from "./track_POST.schema";

const deviceOf = (userAgent: string) => {
  if (/bot|crawl|spider|facebookexternalhit|whatsapp|preview/i.test(userAgent)) return "bot";
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  if (/mobi|android|iphone/i.test(userAgent)) return "mobile";
  return "desktop";
};

/** Records a storefront visit or action for the shop's own traffic page. Public, quick, never fails loudly. */
export async function handle(request: Request) {
  const ok = () => new Response(superjson.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const device = deviceOf(request.headers.get("user-agent") ?? "");
    if (device === "bot") return ok();

    const business = await db
      .selectFrom("businesses")
      .select("id")
      .where("slug", "=", input.slug)
      .where("status", "=", "published")
      .executeTakeFirst();
    if (!business) return ok();

    let referrer: string | null = null;
    if (input.referrer) {
      try {
        const host = new URL(input.referrer).hostname.replace(/^www\./, "");
        const own = new URL(request.url).hostname.replace(/^www\./, "");
        referrer = host && host !== own ? host : null;
      } catch {
        referrer = null;
      }
    }

    await db
      .insertInto("storeEvents")
      .values({
        businessId: business.id,
        event: input.event,
        path: input.path ? input.path.slice(0, 300) : null,
        referrer,
        device,
        visitorKey: input.visitorKey && /^[A-Za-z0-9_-]{8,64}$/.test(input.visitorKey) ? input.visitorKey : null,
      })
      .execute();
    return ok();
  } catch {
    return ok();
  }
}

