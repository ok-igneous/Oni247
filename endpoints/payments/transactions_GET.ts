import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OutputType, Transaction } from "./transactions_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    const [orders, bookings, links] = await Promise.all([
      db.selectFrom("orders").select(["id", "trackingCode", "customerName", "totalAmount", "currency", "paymentStatus", "paymentProvider", "paidAt", "createdAt"]).where("businessId", "=", business.id).where("paymentMethod", "=", "online").orderBy("createdAt", "desc").limit(150).execute(),
      db.selectFrom("serviceBookings").select(["id", "code", "serviceName", "customerName", "amountDue", "currency", "paymentStatus", "paymentProvider", "paidAt", "createdAt"]).where("businessId", "=", business.id).where("paymentProvider", "is not", null).orderBy("createdAt", "desc").limit(150).execute(),
      db.selectFrom("linkPayments").innerJoin("paymentLinks", "paymentLinks.id", "linkPayments.linkId").select(["linkPayments.id", "paymentLinks.title", "linkPayments.payerName", "linkPayments.payerEmail", "linkPayments.amount", "linkPayments.currency", "linkPayments.status", "linkPayments.provider", "linkPayments.paidAt", "linkPayments.createdAt"]).where("linkPayments.businessId", "=", business.id).orderBy("linkPayments.createdAt", "desc").limit(150).execute(),
    ]);
    const items: Transaction[] = [
      ...orders.map((o): Transaction => ({ id: o.id, kind: "order", label: `Order ${o.trackingCode}`, customer: o.customerName, amount: Number.parseFloat(o.totalAmount), currency: o.currency, status: o.paymentStatus === "paid" ? "paid" : "pending", provider: o.paymentProvider, at: o.paidAt ?? o.createdAt })),
      ...bookings.map((b): Transaction => ({ id: b.id, kind: "booking", label: b.serviceName, customer: b.customerName, amount: Number.parseFloat(b.amountDue), currency: b.currency, status: b.paymentStatus === "paid" ? "paid" : b.paymentStatus === "failed" ? "failed" : "pending", provider: b.paymentProvider, at: b.paidAt ?? b.createdAt })),
      ...links.map((l): Transaction => ({ id: l.id, kind: "link", label: l.title, customer: l.payerName || l.payerEmail, amount: Number.parseFloat(l.amount), currency: l.currency, status: l.status === "paid" ? "paid" : l.status === "failed" ? "failed" : "pending", provider: l.provider, at: l.paidAt ?? l.createdAt })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const paid = items.filter((i) => i.status === "paid");
    const output: OutputType = {
      currency: business.currency,
      receivedTotal: paid.reduce((s, i) => s + i.amount, 0),
      receivedThisMonth: paid.filter((i) => new Date(i.at) >= monthStart).reduce((s, i) => s + i.amount, 0),
      pendingTotal: items.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0),
      items: items.slice(0, 200),
    };
    return new Response(superjson.stringify(output), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
    const forbidden = error instanceof Error && error.message === "FORBIDDEN";
    return new Response(superjson.stringify({ error: noBusiness ? "Create your business page first." : forbidden ? "You do not have access to payments." : "Not authenticated" }), { status: noBusiness ? 400 : forbidden ? 403 : 401 });
  }
}
