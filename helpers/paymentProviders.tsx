/** Payment gateways an owner can connect, and how a service turns into an amount to pay. Pure, shared. */
export type GatewayProvider = "paystack" | "flutterwave" | "stripe";

export const GATEWAYS: Array<{ id: GatewayProvider; name: string; secretLabel: string; secretHint: string; help: string }> = [
  { id: "paystack", name: "Paystack", secretLabel: "Secret key", secretHint: "sk_live_… or sk_test_…", help: "In your Paystack dashboard, open Settings, then API Keys & Webhooks, and copy the secret key. Customers pay with card, bank transfer or USSD." },
  { id: "flutterwave", name: "Flutterwave", secretLabel: "Secret key", secretHint: "FLWSECK-… or FLWSECK_TEST-…", help: "In your Flutterwave dashboard, open Settings, then API Keys, and copy the secret key. Customers pay with card, bank transfer or USSD." },
  { id: "stripe", name: "Stripe", secretLabel: "Secret key", secretHint: "sk_live_… or sk_test_…", help: "In your Stripe dashboard, open Developers, then API keys, and copy the secret key. Stripe must support the currency of your business." },
];

export const gatewayName = (id: string) => GATEWAYS.find((g) => g.id === id)?.name ?? id;

export type CheckoutMode = "enquiry" | "deposit" | "full";

/** Reads a price typed by an owner, like "₦15,000" or "15000.50". Returns null if there is no usable number. */
export const parseAmount = (price: string): number | null => {
  const cleaned = String(price ?? "").replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

/** What a customer pays online for a service. Decided here from the owner's settings, never from the browser. */
export const bookingAmounts = (service: { price: string; priceType: string; checkoutMode?: string; depositPercent?: number }): { total: number | null; due: number | null; mode: CheckoutMode } => {
  const total = service.priceType === "contact" ? null : parseAmount(service.price);
  const mode: CheckoutMode = service.checkoutMode === "deposit" || service.checkoutMode === "full" ? service.checkoutMode : "enquiry";
  if (total === null || mode === "enquiry") return { total, due: null, mode: "enquiry" };
  if (mode === "full") return { total, due: total, mode };
  const pct = Math.min(100, Math.max(1, Math.round(service.depositPercent ?? 30)));
  const due = Math.min(total, Math.max(1, Math.round(((total * pct) / 100) * 100) / 100));
  return { total, due, mode };
};
