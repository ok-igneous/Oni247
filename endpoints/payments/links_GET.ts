import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OutputType } from "./links_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    const origin = new URL(request.url).origin;
    const links = await db.selectFrom("paymentLinks").selectAll().where("businessId", "=", business.id).orderBy("createdAt", "desc").execute();
    const paid = await db
      .selectFrom("linkPayments")
      .select(["linkId", "amount"])
      .where("businessId", "=", business.id)
      .where("status", "=", "paid")
      .execute();
    const live = await db.selectFrom("paymentGateways").select("id").where("businessId", "=", business.id).where("enabled", "=", true).executeTakeFirst();
    const output: OutputType = {
      currency: business.currency,
      gatewayLive: Boolean(live),
      links: links.map((l) => {
        const mine = paid.filter((p) => p.linkId === l.id);
        return {
          id: l.id,
          code: l.code,
          title: l.title,
          description: l.description,
          amount: l.amount === null ? null : Number.parseFloat(l.amount),
          active: l.active,
          paidCount: mine.length,
          paidTotal: mine.reduce((sum, p) => sum + Number.parseFloat(p.amount), 0),
          url: `${origin}/pay/${l.code}`,
        };
      }),
    };
    return new Response(superjson.stringify(output), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
    const forbidden = error instanceof Error && error.message === "FORBIDDEN";
    return new Response(superjson.stringify({ error: noBusiness ? "Create your business page first." : forbidden ? "You do not have access to payments." : "Not authenticated" }), { status: noBusiness ? 400 : forbidden ? 403 : 401 });
  }
}
