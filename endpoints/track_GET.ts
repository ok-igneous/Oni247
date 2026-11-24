import superjson from "superjson";
import { db } from "../helpers/db";
import { schema, type OutputType } from "./track_GET.schema";
import { subscriptionPlan } from "../helpers/subscriptionPlan";
import { parseCheckoutSettings } from "../helpers/parseCheckoutSettings";

type StoredLine = {
  name: string;
  quantity: number;
  lineTotal: number;
  variantLabel?: string | null;
};

export async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    const input = schema.parse({ code: url.searchParams.get("code") ?? "" });

    const order = await db
      .selectFrom("orders")
      .innerJoin("businesses", "businesses.id", "orders.businessId")
      .select([
        "orders.trackingCode",
        "orders.customerName",
        "orders.items",
        "orders.totalAmount",
        "orders.currency",
        "orders.status",
        "orders.shippingStatus",
        "orders.deliveryAddress",
        "orders.ownerNote",
        "orders.createdAt",
        "orders.updatedAt",
        "orders.businessId",
        "orders.deliveryFee",
        "orders.deliveryZone",
        "orders.paymentMethod",
        "orders.paymentStatus",
        "businesses.checkoutSettings as businessCheckoutSettings",
        "businesses.name as businessName",
        "businesses.slug as businessSlug",
        "businesses.logoUrl as businessLogoUrl",
        "businesses.heroImageUrl as businessHeroImageUrl",
        "businesses.themeId as businessThemeId",
        "businesses.appearanceSettings as businessAppearanceSettings",
        "businesses.phone as businessPhone",
        "businesses.whatsappNumber as businessWhatsapp",
        "businesses.plan as businessPlan",
        "businesses.websitePlan as businessWebsitePlan",
        "businesses.trialEndsAt as trialEndsAt",
        "businesses.planRenewsAt as planRenewsAt",
      ])
      .where("orders.trackingCode", "=", input.code)
      .limit(1)
      .executeTakeFirst();

    if (!order) {
      return new Response(
        superjson.stringify({
          error: "No order found with that code. Check it and try again.",
        }),
        { status: 404 },
      );
    }

    if (!subscriptionPlan.resolve({
      plan: order.businessPlan,
      websitePlan: order.businessWebsitePlan,
      trialEndsAt: order.trialEndsAt,
      planRenewsAt: order.planRenewsAt,
    }).canUseTrackingLinks) {
      return new Response(
        superjson.stringify({ error: "Order tracking links are available on Premium." }),
        { status: 402 },
      );
    }

    const lines = (Array.isArray(order.items) ? order.items : []) as StoredLine[];
    const orderedNames = new Set(lines.map((line) => line.name));

    // "You might also like" — featured first, then the rest, skipping what is
    // already in this order.
    const catalogue = await db
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
      ])
      .where("businessId", "=", order.businessId)
      .where("available", "=", true)
      .orderBy("featured", "desc")
      .orderBy("sortOrder", "asc")
      .limit(24)
      .execute();

    const recommended = catalogue
      .filter((product) => !orderedNames.has(product.name))
      .slice(0, 4)
      .map((product) => ({
        ...product,
        price: Number.parseFloat(product.price),
      }));

    const output: OutputType = {
      order: {
        trackingCode: order.trackingCode,
        customerName: order.customerName,
        items: lines,
        totalAmount: Number.parseFloat(order.totalAmount),
        currency: order.currency,
        status: order.status,
        shippingStatus: order.shippingStatus,
        deliveryAddress: order.deliveryAddress,
        ownerNote: order.ownerNote,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        deliveryFee: Number.parseFloat(order.deliveryFee),
        deliveryZone: order.deliveryZone,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        bank:
          order.paymentMethod === "bank_transfer" &&
          order.paymentStatus === "unpaid" &&
          order.status !== "cancelled"
            ? parseCheckoutSettings(order.businessCheckoutSettings).bank
            : null,
      },
      business: {
        name: order.businessName,
        slug: order.businessSlug,
        phone: order.businessPhone,
        whatsappNumber: order.businessWhatsapp,
        logoUrl: order.businessLogoUrl,
        heroImageUrl: order.businessHeroImageUrl,
        themeId: order.businessThemeId,
        appearanceSettings: order.businessAppearanceSettings && typeof order.businessAppearanceSettings === "object" && !Array.isArray(order.businessAppearanceSettings) ? order.businessAppearanceSettings as Record<string, unknown> : {},
      },
      recommended,
    };

    return new Response(superjson.stringify(output satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not find that order.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}
