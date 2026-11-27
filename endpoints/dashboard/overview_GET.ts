import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { hasPaidCustomDomainAccess } from "../../helpers/domainEntitlement";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OutputType } from "./overview_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);

    const [products, categories, enquiries, orders] = await Promise.all([
      db.selectFrom("products").select(({ fn }) => fn.countAll<string>().as("count"))
        .where("businessId", "=", business.id).executeTakeFirstOrThrow(),
      db.selectFrom("categories").select(({ fn }) => fn.countAll<string>().as("count"))
        .where("businessId", "=", business.id).executeTakeFirstOrThrow(),
      db.selectFrom("enquiries").select(({ fn }) => fn.countAll<string>().as("count"))
        .where("businessId", "=", business.id).where("status", "=", "new").executeTakeFirstOrThrow(),
      db.selectFrom("orders").select(({ fn }) => fn.countAll<string>().as("count"))
        .where("businessId", "=", business.id).where("status", "=", "pending").executeTakeFirstOrThrow(),
    ]);

    const configuredRoot = process.env.APP_BASE_URL || "https://oni247.org";
    const platformRootDomain = new URL(configuredRoot.includes("://") ? configuredRoot : `https://${configuredRoot}`)
      .hostname.toLowerCase();
    const canUseCustomDomains = await hasPaidCustomDomainAccess(business.ownerId);
    const primary = canUseCustomDomains
      ? await sql<{ hostname: string }>`select hostname from business_domains
          where business_id = ${business.id} and is_primary = true
            and status = 'active' and ssl_status = 'active'
          limit 1`.execute(db)
      : { rows: [] as Array<{ hostname: string }> };

    // A customer domain is optional. Without one, the canonical share URL is /{slug}.
    const output: OutputType = {
      hasBusiness: true,
      businessName: business.name,
      slug: business.slug,
      platformRootDomain,
      primaryDomain: primary.rows[0]?.hostname ?? null,
      platformWildcardReady: false,
      status: business.status,
      productCount: Number(products.count),
      categoryCount: Number(categories.count),
      newEnquiryCount: Number(enquiries.count),
      pendingOrderCount: Number(orders.count),
    };

    return new Response(superjson.stringify(output satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_BUSINESS") {
      return new Response(superjson.stringify({ hasBusiness: false } satisfies OutputType), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(superjson.stringify({ error: "Not authenticated" }), { status: 401 });
  }
}
