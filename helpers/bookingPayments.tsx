import { db } from "./db";
import { decryptSecret } from "./mailCrypto";
import { verifyPayment } from "./gatewayApi";
import type { GatewayProvider } from "./paymentProviders";
import { runEmailAutomation } from "./runEmailAutomation";

type BookingRow = {
  id: string;
  businessId: string;
  code: string;
  serviceName: string;
  customerName: string;
  customerEmail: string | null;
  currency: string;
  amountDue: string;
  paymentStatus: string;
  status: string;
  paymentProvider: string | null;
  paymentReference: string | null;
  providerRef: string | null;
};

/**
 * Checks an unpaid online booking with its gateway and settles it if the money arrived.
 * Safe to call from a webhook, a return page or the owner's dashboard: the gateway decides, not the caller.
 */
export const refreshBookingPayment = async (booking: BookingRow, origin = ""): Promise<"paid" | "pending" | "failed"> => {
  if (booking.paymentStatus === "paid") return "paid";
  if (!booking.paymentProvider || !booking.paymentReference) return "pending";
  const gateway = await db
    .selectFrom("paymentGateways")
    .select("secretEnc")
    .where("businessId", "=", booking.businessId)
    .where("provider", "=", booking.paymentProvider)
    .executeTakeFirst();
  if (!gateway?.secretEnc) return "pending";
  const secret = await decryptSecret(gateway.secretEnc);
  const result = await verifyPayment(booking.paymentProvider as GatewayProvider, secret, {
    reference: booking.paymentReference,
    providerRef: booking.providerRef,
    amount: Number.parseFloat(booking.amountDue),
    currency: booking.currency,
  });
  if (result.status === "paid") {
    const updated = await db
      .updateTable("serviceBookings")
      .set({ paymentStatus: "paid", paidAt: new Date(), status: booking.status === "requested" ? "confirmed" : booking.status, updatedAt: new Date() })
      .where("id", "=", booking.id)
      .where("paymentStatus", "<>", "paid")
      .executeTakeFirst();
    // Only the call that actually flipped it to paid sends the email, so a webhook and a return page do not both send.
    if (Number(updated.numUpdatedRows) > 0) {
      await runEmailAutomation(booking.businessId, "booking_confirmed", { email: booking.customerEmail, name: booking.customerName }, { order: booking.code, service: booking.serviceName }, origin);
    }
  }
  return result.status;
};
