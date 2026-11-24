import superjson from "superjson";
import { db } from "../../helpers/db";
import { generateTrackingCode } from "../../helpers/generateTrackingCode";
import { schema, type OutputType, type OrderConfirmationLine } from "./order_POST.schema";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { parseCheckoutSettings } from "../../helpers/parseCheckoutSettings";
import {
  resolveVariantSelection,
  type ProductVariant,
} from "../../helpers/resolveVariantSelection";
import { adjustProductStock } from "../../helpers/adjustProductStock";
import { normalizeCustomerPhone } from "../../helpers/normalizeCustomerPhone";
import { startOrderPayment } from "../../helpers/startOrderPayment";

const fail = (message: string, status = 400) =>
  new Response(superjson.stringify({ error: message }), { status });

export async function handle(request: Request) {
  try {
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    const business = await db
      .selectFrom("businesses")
      .select([
        "id",
        "name",
        "slug",
        "currency",
        "plan",
        "trialEndsAt",
        "planRenewsAt",
        "checkoutSettings",
      ])
      .where("slug", "=", input.slug)
      .where("status", "=", "published")
      .limit(1)
      .executeTakeFirst();

    if (!business) return fail("This business page was not found.", 404);

    const settings = parseCheckoutSettings(business.checkoutSettings);

    // Prices and names come from the DATABASE, never from the request body —
    // otherwise a customer could post their own totals.
    const ids = [...new Set(input.items.map((item) => item.productId))];
    const products = await db
      .selectFrom("products")
      .select([
        "id",
        "name",
        "price",
        "costPrice",
        "available",
        "stockQuantity",
        "variants",
      ])
      .where("businessId", "=", business.id)
      .where("id", "in", ids)
      .execute();

    const lines: Array<
      OrderConfirmationLine & {
        productId: string;
        unitCost: number | null;
        variants: Array<{ name: string; value: string }>;
      }
    > = [];

    for (const item of input.items) {
      const product = products.find((row) => row.id === item.productId);
      if (!product) return fail("One of the items in your cart no longer exists.");
      if (!product.available || product.stockQuantity === 0) {
        return fail(`${product.name} is not available right now.`);
      }

      const basePrice = Number.parseFloat(product.price);
      const productVariants = (
        Array.isArray(product.variants) ? product.variants : []
      ) as ProductVariant[];

      let unitPrice = basePrice;
      let chosen: Array<{ name: string; value: string }> = [];
      let variantLabel: string | null = null;

      // Older clients never send `variants`; they keep the old behaviour and are
      // charged the base price. Any request that does send them is validated.
      if (item.variants !== undefined) {
        const selected: Record<string, string> = {};
        for (const pick of item.variants) selected[pick.name] = pick.value;
        const resolved = resolveVariantSelection(basePrice, productVariants, selected);
        if (resolved.missingGroup) {
          return fail(`Choose a ${resolved.missingGroup} for ${product.name}.`);
        }
        if (resolved.invalidGroup || resolved.chosen.length !== item.variants.length) {
          return fail(`An option for ${product.name} is no longer available.`);
        }
        unitPrice = resolved.price;
        chosen = resolved.chosen;
        variantLabel = resolved.label || null;
      }

      lines.push({
        productId: product.id,
        name: product.name,
        variants: chosen,
        variantLabel,
        quantity: item.quantity,
        unitPrice,
        unitCost: product.costPrice == null ? null : Number.parseFloat(product.costPrice),
        lineTotal: Number((unitPrice * item.quantity).toFixed(2)),
      });
    }

    const subtotal = Number(
      lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2),
    );

    // Delivery fee and payment method. A request without deliveryMethod comes
    // from an older client and keeps the old behaviour: no fee, no payment choice.
    let deliveryFee = 0;
    let deliveryZone: string | null = null;
    let address = input.deliveryAddress;

    if (input.deliveryMethod === "pickup") {
      if (!settings.pickupEnabled) return fail("This shop does not offer pickup.");
      deliveryZone = "Pickup";
      address = null;
    } else if (input.deliveryMethod === "delivery") {
      if (!settings.deliveryEnabled) return fail("This shop does not offer delivery.");
      if (!address || address.length < 5) {
        return fail("Enter your delivery address.");
      }
      if (settings.zones.length > 0) {
        const zone = settings.zones.find((row) => row.name === input.deliveryZone);
        if (!zone) return fail("Choose your delivery area.");
        deliveryZone = zone.name;
        deliveryFee =
          settings.freeDeliveryOver !== null && subtotal >= settings.freeDeliveryOver
            ? 0
            : zone.fee;
      }
    }

    const paymentMethod = input.paymentMethod ?? null;
    const onlineGateway =
      paymentMethod === "online"
        ? await db
            .selectFrom("paymentGateways")
            .select("id")
            .where("businessId", "=", business.id)
            .where("enabled", "=", true)
            .limit(1)
            .executeTakeFirst()
        : null;
    if (paymentMethod !== null) {
      const allowed =
        (paymentMethod === "online" && Boolean(onlineGateway)) ||
        (paymentMethod === "cash_on_delivery" &&
          settings.paymentMethods.cashOnDelivery &&
          input.deliveryMethod !== "pickup") ||
        (paymentMethod === "pay_on_pickup" &&
          settings.paymentMethods.payOnPickup &&
          input.deliveryMethod === "pickup") ||
        (paymentMethod === "bank_transfer" &&
          settings.paymentMethods.bankTransfer &&
          settings.bank.accountNumber.length > 0);
      if (!allowed) return fail("That payment method is not available.");
    }

    const total = Number((subtotal + deliveryFee).toFixed(2));
    const phoneKey = normalizeCustomerPhone(input.customerPhone);
    if (paymentMethod === "online" && (!input.customerEmail || phoneKey.length < 4)) {
      return fail("Enter your email address and phone number to pay online.");
    }

    const order = await db.transaction().execute(async (trx) => {
      // Locks the rows and refuses if someone else just bought the last one.
      await adjustProductStock(
        trx,
        business.id,
        lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        "take",
      );

      let customerId: string | null = null;
      if (phoneKey.length >= 4) {
        const customer = await trx
          .insertInto("customers")
          .values({
            businessId: business.id,
            name: input.customerName,
            phone: input.customerPhone,
            phoneKey,
            email: input.customerEmail,
            lastAddress: address,
          })
          .onConflict((oc) =>
            oc.columns(["businessId", "phoneKey"]).doUpdateSet({
              name: input.customerName,
              phone: input.customerPhone,
              ...(input.customerEmail ? { email: input.customerEmail } : {}),
              ...(address ? { lastAddress: address } : {}),
              updatedAt: new Date(),
            }),
          )
          .returning(["id"])
          .executeTakeFirstOrThrow();
        customerId = customer.id;
      }

      // ON CONFLICT DO NOTHING keeps the transaction alive if a tracking code
      // ever collides, so we can simply try another one.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const inserted = await trx
          .insertInto("orders")
          .values({
            businessId: business.id,
            customerId,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            customerNote: input.customerNote,
            deliveryAddress: address,
            deliveryZone,
            deliveryFee: deliveryFee.toFixed(2),
            paymentMethod,
            items: lines.map(({ productId, name, variants, variantLabel, quantity, unitPrice, unitCost, lineTotal }) => ({
              productId,
              name,
              variants,
              variantLabel,
              quantity,
              unitPrice,
              unitCost,
              lineTotal,
            })),
            totalAmount: total.toFixed(2),
            currency: business.currency,
            status: "pending",
            source: "online",
            shippingStatus: address ? "preparing" : "not_required",
            stockReserved: true,
            trackingCode: generateTrackingCode(),
          })
          .onConflict((oc) => oc.column("trackingCode").doNothing())
          .returning(["id", "trackingCode"])
          .executeTakeFirst();
        if (inserted) return inserted;
      }
      throw new Error("Could not record the order. Please try again.");
    });

    const canTrack = subscriptionPlan.resolve(business).canUseTrackingLinks;

    let paymentUrl: string | null = null;
    let paymentError: string | null = null;
    if (paymentMethod === "online") {
      const started = await startOrderPayment(
        {
          id: order.id,
          businessId: business.id,
          trackingCode: order.trackingCode,
          totalAmount: total.toFixed(2),
          currency: business.currency,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
        },
        { name: business.name, slug: business.slug },
        new URL(request.url).origin,
      );
      if (started.ok) paymentUrl = started.url;
      else paymentError = started.error;
    }

    const output: OutputType = {
      orderId: order.id,
      trackingCode: canTrack ? order.trackingCode : null,
      orderRef: order.trackingCode,
      total,
      subtotal,
      deliveryFee,
      deliveryZone,
      paymentMethod,
      bank:
        paymentMethod === "bank_transfer"
          ? {
              bankName: settings.bank.bankName,
              accountName: settings.bank.accountName,
              accountNumber: settings.bank.accountNumber,
            }
          : null,
      lines: lines.map((line) => ({
        name: line.name,
        variantLabel: line.variantLabel,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
      currency: business.currency,
      paymentUrl,
      paymentError,
    };

    return new Response(superjson.stringify(output), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not record the order.";
    return fail(message);
  }
}

