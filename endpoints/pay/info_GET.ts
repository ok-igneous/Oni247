import superjson from "superjson";
import { db } from "../../helpers/db";
import type { PayInfo } from "./info_GET.schema";

const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });

export async function handle(request: Request) {
  try {
    const code = (new URL(request.url).searchParams.get("code") ?? "").toLowerCase();
    if (!/^[a-z0-9]{4,20}$/.test(code)) return fail("This payment link does not exist.", 404);
    const link = await db.selectFrom("paymentLinks").selectAll().where("code", "=", code).executeTakeFirst();
    if (!link) return fail("This payment link does not exist.", 404);
    const business = await db.selectFrom("businesses").select(["id", "name", "slug", "logoUrl", "whatsappNumber", "currency", "status"]).where("id", "=", link.businessId).executeTakeFirst();
    if (!business || business.status === "suspended") return fail("This payment link does not exist.", 404);
    const gateway = await db.selectFrom("paymentGateways").select("id").where("businessId", "=", business.id).where("enabled", "=", true).executeTakeFirst();
    const output: PayInfo = {
      business: { name: business.name, slug: business.slug, logoUrl: business.logoUrl, whatsappNumber: business.whatsappNumber },
      title: link.title,
      description: link.description,
      amount: link.amount === null ? null : Number.parseFloat(link.amount),
      currency: business.currency,
      available: link.active && Boolean(gateway),
    };
    return new Response(superjson.stringify(output), { headers: { "Content-Type": "application/json" } });
  } catch {
    return fail("Could not load this payment link.", 500);
  }
}
