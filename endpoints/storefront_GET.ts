import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../helpers/db";
import { schema, type OutputType } from "./storefront_GET.schema";
import { subscriptionPlan } from "../helpers/subscriptionPlan";
import { sanitizeBlogContent } from "../helpers/sanitizeBlogContent";
import { parseCheckoutSettings } from "../helpers/parseCheckoutSettings";
import { summariseBlogContent } from "../helpers/summariseBlogContent";
import { parseBlogSettings } from "../helpers/parseBlogSettings";
import { readServices } from "../helpers/serviceModel";
import { bookingAmounts } from "../helpers/paymentProviders";
import { loadPlanConfig } from "../helpers/planConfig";

const MAX_PRODUCTS = 200;

export async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    const input = schema.parse({ slug: url.searchParams.get("slug") ?? "" });

    const business = await db
      .selectFrom("businesses")
      .select([
        "id",
        "slug",
        "name",
        "description",
        "logoUrl",
        "heroHeadline",
        "heroSubtext",
        "heroImageUrl",
        "heroCtaLabel",
        "appearanceSettings",
        "contentSettings",
        "phone",
        "whatsappNumber",
        "email",
        "address",
        "openingHours",
        "themeId",
        "currency",
        "plan",
        "websitePlan",
        "trialEndsAt",
        "planRenewsAt",
        "checkoutSettings",
        "blogSettings",
      ])
      .where("slug", "=", input.slug)
      .where("status", "=", "published")
      .limit(1)
      .executeTakeFirst();

    if (!business) {
      return new Response(
        superjson.stringify({ error: "This business page was not found." }),
        { status: 404 },
      );
    }

    const resolvedPlan = subscriptionPlan.resolve(business);
    await loadPlanConfig();

    const gatewayResult = await sql<{ enabled: boolean }>`select app_private.has_public_payment_gateway(${business.id}) as enabled`.execute(db);
    const gatewayEnabled = Boolean(gatewayResult.rows[0]?.enabled);
    const services: OutputType["services"] = readServices(business.contentSettings)
      .filter((s) => s.published)
      .map((s) => {
        const amounts = bookingAmounts(s);
        return { ...s, published: true, payOnline: gatewayEnabled && amounts.due !== null, amountDue: amounts.due ?? undefined, amountTotal: amounts.total ?? undefined };
      });

    const [categories, products, testimonials, portfolio, blogPosts, events] = await Promise.all([
      db
        .selectFrom("categories")
        .select(["id", "name", "description"])
        .where("businessId", "=", business.id)
        .orderBy("sortOrder", "asc")
        .orderBy("name", "asc")
        .execute(),
      db
        .selectFrom("products")
        .select([
          "id",
          "categoryId",
          "name",
          "slug",
          "description",
          "price",
          "currency",
          "imageUrl",
          "available",
          "featured",
          "costPrice",
          "unit",
          "variants",
          "stockQuantity",
          "images",
          "compareAtPrice",
          "createdAt",
        ])
        .where("businessId", "=", business.id)
        .orderBy("sortOrder", "asc")
        .orderBy("createdAt", "asc")
        .limit(MAX_PRODUCTS)
        .execute(),
      db
        .selectFrom("testimonials")
        .select(["id", "authorName", "authorRole", "quote", "rating", "imageUrl"])
        .where("businessId", "=", business.id)
        .where("published", "=", true)
        .orderBy("sortOrder", "asc")
        .orderBy("createdAt", "asc")
        .limit(30)
        .execute(),
      db
        .selectFrom("portfolioItems")
        .select(["id", "title", "description", "imageUrl", "linkUrl"])
        .where("businessId", "=", business.id)
        .orderBy("sortOrder", "asc")
        .orderBy("createdAt", "asc")
        .limit(60)
        .execute(),
      db
        .selectFrom("blogPosts")
        .select(["id", "slug", "title", "excerpt", "coverImageUrl", "content", "publishedAt"])
        .where("businessId", "=", business.id)
        .where("published", "=", true)
        .orderBy("publishedAt", "desc")
        .orderBy("createdAt", "desc")
        .limit(60)
        .execute(),
      resolvedPlan.canUseEvents ? db.selectFrom("events").select(["id","title","slug","description","coverImageUrl","startsAt","endsAt","venue","registrationEnabled"]).where("businessId","=",business.id).where("published","=",true).where("startsAt",">",new Date()).orderBy("startsAt","asc").limit(6).execute() : Promise.resolve([]),
    ]);

    const { checkoutSettings, blogSettings, trialEndsAt: _trialEndsAt, planRenewsAt: _planRenewsAt, ...businessPublic } = business;
    const checkout = parseCheckoutSettings(checkoutSettings);

    const output: OutputType = {
      business: {
        ...businessPublic,
        appearanceSettings:
          business.appearanceSettings &&
          typeof business.appearanceSettings === "object" &&
          !Array.isArray(business.appearanceSettings)
            ? (business.appearanceSettings as Record<string, unknown>)
            : {},
        contentSettings: (() => {
          const settings =
            business.contentSettings &&
            typeof business.contentSettings === "object" &&
            !Array.isArray(business.contentSettings)
              ? (business.contentSettings as Record<string, unknown>)
              : {};
          // Do not ship unpublished service drafts inside the raw settings blob.
          return { ...settings, services };
        })(),
        canUseProductLinks: resolvedPlan.canUseProductLinks,
        canUseMultiPage: resolvedPlan.canUseMultiPage,
        blogSettings: parseBlogSettings(blogSettings),
        checkout: {
          deliveryEnabled: checkout.deliveryEnabled,
          pickupEnabled: checkout.pickupEnabled,
          pickupNote: checkout.pickupNote,
          zones: checkout.zones.map((zone) => ({ name: zone.name, fee: zone.fee })),
          freeDeliveryOver: checkout.freeDeliveryOver,
          deliveryNote: checkout.deliveryNote,
          returnPolicy: checkout.returnPolicy,
          paymentMethods: {
            ...checkout.paymentMethods,
            online: gatewayEnabled,
            // Bank transfer is only offered once account details exist.
            bankTransfer:
              checkout.paymentMethods.bankTransfer &&
              checkout.bank.accountNumber.length > 0,
          },
        },
      },
      categories,
      services: resolvedPlan.canUseServices ? services : [],
      products: products.map(
        ({ costPrice: _costPrice, compareAtPrice, images, stockQuantity, ...product }) => {
          const price = Number.parseFloat(product.price);
          const was = compareAtPrice == null ? null : Number.parseFloat(compareAtPrice);
          return {
            ...product,
            price,
            // A sold-out product reads as unavailable everywhere, including older clients.
            available: product.available && (stockQuantity === null || stockQuantity > 0),
            images: Array.isArray(images)
              ? images.filter((url): url is string => typeof url === "string").slice(0, 8)
              : [],
            compareAtPrice: was !== null && was > price ? was : null,
            variants: Array.isArray(product.variants)
              ? (product.variants as Array<{ name: string; value: string; price: number | null }>)
              : [],
          };
        },
      ),
      testimonials,
      portfolio,
      blogPosts: resolvedPlan.canUseBlog
        ? blogPosts.map((post) => ({
            ...post,
            // Cards always have a summary, even when the author wrote none.
            excerpt: summariseBlogContent(post.excerpt, post.content),
            autoExcerpt: !post.excerpt || post.excerpt.trim() === "",
            content: sanitizeBlogContent(post.content),
          }))
        : [],
      events,
    };

    return new Response(superjson.stringify(output satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load this store.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}
