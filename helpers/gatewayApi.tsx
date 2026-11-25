import type { GatewayProvider } from "./paymentProviders";

export type InitInput = {
  reference: string;
  amount: number;
  currency: string;
  email: string;
  name: string;
  phone?: string;
  title: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
};
export type InitResult = { ok: true; url: string; providerRef?: string } | { ok: false; error: string };
export type VerifyResult = { status: "paid" | "pending" | "failed"; error?: string };

const TIMEOUT = 15_000;
const call = (url: string, init: RequestInit) => fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) });
const bearer = (secret: string) => ({ Authorization: `Bearer ${secret}` });
const asJson = async (res: Response) => {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
};
const msg = (j: Record<string, unknown>, fallback: string) => {
  const m = j.message ?? (j.error && typeof j.error === "object" ? (j.error as Record<string, unknown>).message : undefined);
  return typeof m === "string" && m ? m : fallback;
};
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/** Starts a hosted checkout with the owner's own gateway account. Backend only. */
export const initCheckout = async (provider: GatewayProvider, secret: string, i: InitInput): Promise<InitResult> => {
  try {
    if (provider === "paystack") {
      const res = await call("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { ...bearer(secret), "Content-Type": "application/json" },
        body: JSON.stringify({ email: i.email, amount: Math.round(i.amount * 100), currency: i.currency, reference: i.reference, callback_url: i.returnUrl, metadata: { title: i.title, customer_name: i.name } }),
      });
      const j = await asJson(res);
      const d = obj(j.data);
      if (!res.ok || j.status !== true || typeof d.authorization_url !== "string") return { ok: false, error: msg(j, "Paystack could not start the payment.") };
      return { ok: true, url: d.authorization_url, providerRef: typeof d.access_code === "string" ? d.access_code : undefined };
    }
    if (provider === "flutterwave") {
      const res = await call("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: { ...bearer(secret), "Content-Type": "application/json" },
        body: JSON.stringify({
          tx_ref: i.reference,
          amount: i.amount,
          currency: i.currency,
          redirect_url: i.returnUrl,
          payment_options: "card,banktransfer,ussd",
          customer: { email: i.email, name: i.name, phonenumber: i.phone || undefined },
          customizations: { title: i.title.slice(0, 60), description: i.description.slice(0, 120) },
        }),
      });
      const j = await asJson(res);
      const d = obj(j.data);
      if (!res.ok || j.status !== "success" || typeof d.link !== "string") return { ok: false, error: msg(j, "Flutterwave could not start the payment.") };
      return { ok: true, url: d.link };
    }
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", i.returnUrl);
    form.set("cancel_url", i.cancelUrl);
    form.set("client_reference_id", i.reference);
    form.set("customer_email", i.email);
    form.set("metadata[reference]", i.reference);
    form.set("line_items[0][quantity]", "1");
    form.set("line_items[0][price_data][currency]", i.currency.toLowerCase());
    form.set("line_items[0][price_data][unit_amount]", String(Math.round(i.amount * 100)));
    form.set("line_items[0][price_data][product_data][name]", i.title.slice(0, 120));
    if (i.description) form.set("line_items[0][price_data][product_data][description]", i.description.slice(0, 300));
    const res = await call("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { ...bearer(secret), "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const j = await asJson(res);
    if (!res.ok || typeof j.url !== "string") return { ok: false, error: msg(j, "Stripe could not start the payment.") };
    return { ok: true, url: j.url, providerRef: typeof j.id === "string" ? j.id : undefined };
  } catch {
    return { ok: false, error: "The payment provider did not respond. Please try again." };
  }
};

/** Asks the gateway directly whether a payment went through. Never trusts what the browser says. */
export const verifyPayment = async (
  provider: GatewayProvider,
  secret: string,
  p: { reference: string; providerRef?: string | null; amount: number; currency: string },
): Promise<VerifyResult> => {
  try {
    if (provider === "paystack") {
      const res = await call(`https://api.paystack.co/transaction/verify/${encodeURIComponent(p.reference)}`, { headers: bearer(secret) });
      const j = await asJson(res);
      const d = obj(j.data);
      if (!res.ok) return res.status === 404 ? { status: "pending" } : { status: "pending", error: msg(j, "Could not check the payment.") };
      if (d.status === "success") {
        const paid = Number(d.amount) / 100;
        return paid + 0.001 >= p.amount && String(d.currency ?? p.currency).toUpperCase() === p.currency.toUpperCase() ? { status: "paid" } : { status: "failed", error: "The amount paid does not match." };
      }
      return d.status === "failed" || d.status === "reversed" ? { status: "failed" } : { status: "pending" };
    }
    if (provider === "flutterwave") {
      const res = await call(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(p.reference)}`, { headers: bearer(secret) });
      const j = await asJson(res);
      const d = obj(j.data);
      if (!res.ok || j.status !== "success") return { status: "pending" };
      if (d.status === "successful") {
        return Number(d.amount) + 0.001 >= p.amount && String(d.currency ?? p.currency).toUpperCase() === p.currency.toUpperCase() ? { status: "paid" } : { status: "failed", error: "The amount paid does not match." };
      }
      return d.status === "failed" ? { status: "failed" } : { status: "pending" };
    }
    if (!p.providerRef) return { status: "pending" };
    const res = await call(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(p.providerRef)}`, { headers: bearer(secret) });
    const j = await asJson(res);
    if (!res.ok) return { status: "pending" };
    if (j.payment_status === "paid") {
      return Number(j.amount_total) / 100 + 0.001 >= p.amount ? { status: "paid" } : { status: "failed", error: "The amount paid does not match." };
    }
    return j.status === "expired" ? { status: "failed" } : { status: "pending" };
  } catch {
    return { status: "pending", error: "Could not reach the payment provider." };
  }
};

/** A cheap authenticated call, to confirm the keys an owner pasted are real. */
export const testGateway = async (provider: GatewayProvider, secret: string): Promise<{ ok: true } | { ok: false; error: string }> => {
  const url =
    provider === "paystack" ? "https://api.paystack.co/bank?perPage=1" : provider === "flutterwave" ? "https://api.flutterwave.com/v3/banks/NG" : "https://api.stripe.com/v1/balance";
  try {
    const res = await call(url, { headers: bearer(secret) });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) return { ok: false, error: "The provider rejected this key. Check that you copied the secret key." };
    return { ok: false, error: "The provider could not confirm this key. Try again." };
  } catch {
    return { ok: false, error: "The payment provider did not respond. Try again." };
  }
};
