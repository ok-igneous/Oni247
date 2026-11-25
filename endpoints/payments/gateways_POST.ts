import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { decryptSecret, encryptSecret, mailKeyConfigured } from "../../helpers/mailCrypto";
import { testGateway } from "../../helpers/gatewayApi";
import { schema, type OutputType } from "./gateways_POST.schema";

const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });

export async function handle(request: Request) {
  let business;
  try {
    business = (await requireOwnedBusiness(request)).business;
  } catch {
    return fail("Not authenticated", 401);
  }
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const ok = () => new Response(superjson.stringify({ ok: true } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
    const row = await db.selectFrom("paymentGateways").selectAll().where("businessId", "=", business.id).where("provider", "=", input.provider).executeTakeFirst();

    if (input.op === "remove") {
      await db.deleteFrom("paymentGateways").where("businessId", "=", business.id).where("provider", "=", input.provider).execute();
      return ok();
    }

    if (input.op === "save") {
      if (!mailKeyConfigured()) return fail("Saving payment keys is not switched on for this site yet. Please contact support.", 503);
      const key = input.secretKey?.trim();
      if (!key) return fail("Paste your secret key.", 400);
      if (/^pk_|^FLWPUBK/i.test(key)) return fail("That looks like a public key. Paste the secret key instead.", 400);
      const enc = await encryptSecret(key);
      if (row) {
        await db.updateTable("paymentGateways").set({ secretEnc: enc, enabled: false, verifiedAt: null, lastError: null, updatedAt: new Date() }).where("id", "=", row.id).execute();
      } else {
        await db.insertInto("paymentGateways").values({ businessId: business.id, provider: input.provider, secretEnc: enc }).execute();
      }
      return ok();
    }

    if (!row?.secretEnc) return fail("Save your secret key first.", 400);

    if (input.op === "test") {
      const result = await testGateway(input.provider, await decryptSecret(row.secretEnc));
      await db
        .updateTable("paymentGateways")
        .set(result.ok ? { verifiedAt: new Date(), lastError: null, updatedAt: new Date() } : { verifiedAt: null, enabled: false, lastError: result.error, updatedAt: new Date() })
        .where("id", "=", row.id)
        .execute();
      if (!result.ok) return fail(result.error, 400);
      return ok();
    }

    // enable / disable
    if (input.enabled && !row.verifiedAt) return fail("Test your keys first, then switch it on.", 400);
    // One gateway is active at a time, so customers always pay through the same account.
    if (input.enabled) {
      await db.updateTable("paymentGateways").set({ enabled: false, updatedAt: new Date() }).where("businessId", "=", business.id).where("id", "<>", row.id).execute();
    }
    await db.updateTable("paymentGateways").set({ enabled: input.enabled, updatedAt: new Date() }).where("id", "=", row.id).execute();
    return ok();
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not save.", 400);
  }
}
