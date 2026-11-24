import superjson from "superjson";
import { nanoid } from "nanoid";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { schema, type OutputType } from "./links_POST.schema";

const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });

export async function handle(request: Request) {
  let business;
  try {
    business = (await requireOwnedBusiness(request)).business;
  } catch (error) {
    return fail(error instanceof Error && error.message === "FORBIDDEN" ? "You do not have access to payments." : "Not authenticated", error instanceof Error && error.message === "FORBIDDEN" ? 403 : 401);
  }
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const ok = () => new Response(superjson.stringify({ ok: true } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
    if (input.op === "delete") {
      await db.deleteFrom("paymentLinks").where("businessId", "=", business.id).where("id", "=", input.id).execute();
      return ok();
    }
    const values = { title: input.title, description: input.description, amount: input.amount === null ? null : input.amount.toFixed(2), active: input.active, updatedAt: new Date() };
    if (input.id) {
      const res = await db.updateTable("paymentLinks").set(values).where("businessId", "=", business.id).where("id", "=", input.id).executeTakeFirst();
      if (!Number(res.numUpdatedRows)) return fail("That link was not found.", 404);
      return ok();
    }
    const count = await db.selectFrom("paymentLinks").select(({ fn }) => fn.countAll<string>().as("c")).where("businessId", "=", business.id).executeTakeFirstOrThrow();
    if (Number(count.c) >= 50) return fail("You can have up to 50 payment links. Delete one you no longer use.", 400);
    await db.insertInto("paymentLinks").values({ businessId: business.id, code: nanoid(9).toLowerCase().replace(/[^a-z0-9]/g, "x"), ...values }).execute();
    return ok();
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not save the link.", 400);
  }
}
