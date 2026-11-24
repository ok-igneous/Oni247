import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireAdmin } from "../../helpers/requireAdmin";
import type { OutputType } from "./overview_GET.schema";

export async function handle(request: Request) {
  try {
    await requireAdmin(request);

    const now = new Date();

    const [businesses, owners, products, orders, revenue] = await Promise.all([
      db
        .selectFrom("businesses")
        .select(({ fn, eb }) => [
          fn.countAll<string>().as("total"),
          fn
            .count<string>(eb.case().when("status", "=", "published").then(1).end())
            .as("published"),
          fn
            .count<string>(eb.case().when("status", "=", "suspended").then(1).end())
            .as("suspended"),
          fn
            .count<string>(
              eb
                .case()
                .when(eb.and([eb("plan", "=", "premium"), eb("planRenewsAt", ">", now)]))
                .then(1)
                .end(),
            )
            .as("premiumActive"),
          fn
            .count<string>(
              eb
                .case()
                .when(eb.and([eb("plan", "=", "premium"), eb("planRenewsAt", "<=", now)]))
                .then(1)
                .end(),
            )
            .as("lapsed"),
          fn
            .count<string>(eb.case().when("trialEndsAt", ">", now).then(1).end())
            .as("trialing"),
        ])
        .executeTakeFirstOrThrow(),
      db
        .selectFrom("users")
        .select(({ fn }) => fn.countAll<string>().as("total"))
        .executeTakeFirstOrThrow(),
      db
        .selectFrom("products")
        .select(({ fn }) => fn.countAll<string>().as("total"))
        .executeTakeFirstOrThrow(),
      db
        .selectFrom("orders")
        .select(({ fn }) => [
          fn.countAll<string>().as("total"),
          fn.sum<string>("totalAmount").as("value"),
        ])
        .executeTakeFirstOrThrow(),
      db
        .selectFrom("subscriptionPayments")
        .select(({ fn }) => fn.sum<string>("amount").as("value"))
        .where("status", "=", "successful")
        .executeTakeFirstOrThrow(),
    ]);

    const output: OutputType = {
      businessCount: Number(businesses.total),
      publishedCount: Number(businesses.published),
      suspendedCount: Number(businesses.suspended),
      premiumActiveCount: Number(businesses.premiumActive),
      lapsedCount: Number(businesses.lapsed),
      trialCount: Number(businesses.trialing),
      ownerCount: Number(owners.total),
      productCount: Number(products.total),
      orderCount: Number(orders.total),
      orderValue: Number.parseFloat(orders.value ?? "0"),
      subscriptionRevenue: Number.parseFloat(revenue.value ?? "0"),
      currency: "NGN",
    };

    return new Response(superjson.stringify(output satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const notAdmin = error instanceof Error && error.message === "NOT_ADMIN";
    return new Response(
      superjson.stringify({
        error: notAdmin ? "Administrator access required." : "Not authenticated",
      }),
      { status: notAdmin ? 403 : 401 },
    );
  }
}
