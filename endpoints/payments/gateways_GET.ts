import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { mailKeyConfigured } from "../../helpers/mailCrypto";
import { GATEWAYS } from "../../helpers/paymentProviders";
import type { OutputType } from "./gateways_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    const rows = await db.selectFrom("paymentGateways").selectAll().where("businessId", "=", business.id).execute();
    const origin = new URL(request.url).origin;
    const output: OutputType = {
      serverReady: mailKeyConfigured(),
      gateways: GATEWAYS.map((g) => {
        const row = rows.find((r) => r.provider === g.id);
        return {
          provider: g.id,
          enabled: Boolean(row?.enabled),
          hasSecret: Boolean(row?.secretEnc),
          verified: Boolean(row?.verifiedAt),
          lastError: row?.lastError ?? null,
          webhookUrl: `${origin}/_api/payments/webhook?b=${business.id}&p=${g.id}`,
        };
      }),
    };
    return new Response(superjson.stringify(output), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
    return new Response(superjson.stringify({ error: noBusiness ? "Create your business page first." : "Not authenticated" }), { status: noBusiness ? 400 : 401 });
  }
}
