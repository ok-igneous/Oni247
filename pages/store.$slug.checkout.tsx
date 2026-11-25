import { useStorefrontRouteParams } from "../helpers/storefrontHost";
import { useStorefrontRouteParams } from "../helpers/storefrontHost";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Check,
  Copy,
  ImageOff,
  Landmark,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  Store,
  Truck,
} from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { Spinner } from "../components/Spinner";
import { Skeleton } from "../components/Skeleton";
import { RadioGroup, RadioGroupItem } from "../components/RadioGroup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/Select";
import { StorefrontHeader } from "../components/StorefrontHeader";
import { OrderPaymentReturn } from "../components/OrderPaymentReturn";
import { formatMoney } from "../helpers/formatMoney";
import { buildWhatsAppOrderUrl } from "../helpers/buildWhatsAppOrderUrl";
import { resolveVariantSelection } from "../helpers/resolveVariantSelection";
import { storeThemeEngine } from "../helpers/storeThemeEngine";
import { trackStoreEvent } from "../helpers/trackStoreEvent";
import { useMyOrders } from "../helpers/useMyOrders";
import { useStoreCart } from "../helpers/useStoreCart";
import { useStorefront } from "../helpers/useStorefront";
import {
  postStorefrontOrder,
  type OutputType as PlacedOrder,
} from "../endpoints/storefront/order_POST.schema";
import type { OrderPaymentMethod } from "../helpers/schema";
import styles from "./store.$slug.checkout.module.css";

type Method = "delivery" | "pickup";

const PAYMENT_COPY: Record<
  OrderPaymentMethod,
  { label: string; hint: string }
> = {
  cash_on_delivery: {
    label: "Pay on delivery",
    hint: "Pay when your order arrives.",
  },
  pay_on_pickup: {
    label: "Pay on pickup",
    hint: "Pay when you collect your order.",
  },
  bank_transfer: {
    label: "Bank transfer",
    hint: "You will get the account details after you place the order.",
  },
  online: {
    label: "Pay online",
    hint: "Pay now with card, bank transfer or USSD. Secure checkout.",
  },
};

const CheckoutPage = () => {
  const { slug = "" } = useStorefrontRouteParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const returnRef = searchParams.get("ref");
  const { data, isFetching, error } = useStorefront(slug);
  const cart = useStoreCart(slug);
  const myOrders = useMyOrders(slug);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [methodChoice, setMethodChoice] = useState<Method | null>(null);
  const [paymentChoice, setPaymentChoice] = useState<OrderPaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<{
    order: PlacedOrder;
    name: string;
    phone: string;
    method: Method | null;
  } | null>(null);

  const business = data?.business;
  const checkout = business?.checkout;
  const deliveryOn = checkout?.deliveryEnabled ?? true;
  const pickupOn = checkout?.pickupEnabled ?? false;
  const method: Method = methodChoice ?? (deliveryOn ? "delivery" : "pickup");

  const paymentOptions = useMemo(() => {
    const options: OrderPaymentMethod[] = [];
    const payments = checkout?.paymentMethods;
    if (!payments) return options;
    if (payments.online) options.push("online");
    if (method === "delivery" && payments.cashOnDelivery) options.push("cash_on_delivery");
    if (method === "pickup" && payments.payOnPickup) options.push("pay_on_pickup");
    if (payments.bankTransfer) options.push("bank_transfer");
    return options;
  }, [checkout?.paymentMethods, method]);

  const payment: OrderPaymentMethod | null =
    paymentChoice && paymentOptions.includes(paymentChoice)
      ? paymentChoice
      : (paymentOptions[0] ?? null);

  // Re-price every cart line from the live catalogue so the shopper sees what the
  // shop will actually charge, and spot anything sold out before they pay.
  const lines = useMemo(
    () =>
      cart.items.map((line) => {
        const product = data?.products.find((item) => item.id === line.productId);
        let price = line.price;
        let problem: string | null = null;
        if (data) {
          if (!product) {
            problem = "No longer available";
          } else {
            price = product.price;
            if (line.variants !== undefined) {
              const selected: Record<string, string> = {};
              for (const pick of line.variants) selected[pick.name] = pick.value;
              const resolved = resolveVariantSelection(
                product.price,
                product.variants ?? [],
                selected,
              );
              if (resolved.missingGroup || resolved.invalidGroup) {
                problem = "Options changed — remove and add it again";
              } else {
                price = resolved.price;
              }
            }
            const stock = product.stockQuantity ?? null;
            if (!product.available) problem = "Sold out";
            else if (stock !== null && line.quantity > stock) {
              problem = `Only ${stock} left`;
            }
          }
        }
        return { line, price, problem };
      }),
    [cart.items, data],
  );

  const subtotal = lines.reduce((sum, row) => sum + row.price * row.line.quantity, 0);
  const zone = checkout?.zones.find((item) => item.name === zoneName) ?? null;
  const freeOver = checkout?.freeDeliveryOver ?? null;
  const deliveryFee =
    method === "delivery" && zone
      ? freeOver !== null && subtotal >= freeOver
        ? 0
        : zone.fee
      : 0;
  const total = subtotal + deliveryFee;

  if (isFetching && !data) {
    return (
      <div className={styles.page}>
        <Skeleton className={styles.skeletonBlock} />
        <Skeleton className={styles.skeletonBlock} />
      </div>
    );
  }

  if (error || !data || !business || !checkout) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Shop not found</h1>
        <p className={styles.muted}>Check the link and try again.</p>
      </div>
    );
  }

  const appearance = business.appearanceSettings ?? {};
  const theme = storeThemeEngine(business.themeId, appearance);
  const whatsappNumber = business.whatsappNumber ?? business.phone ?? "";
  const home = `/${business.slug}`;
  const hasProblem = lines.some((row) => row.problem !== null);

  const phoneDigits = phone.replace(/\D/g, "");
  const addressOk = method === "pickup" || address.trim().length >= 5;
  const zoneOk = method === "pickup" || checkout.zones.length === 0 || zone !== null;
  const paymentOk = paymentOptions.length === 0 || payment !== null;
  const emailOk = payment !== "online" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit =
    name.trim().length > 0 &&
    phoneDigits.length >= 7 &&
    addressOk &&
    zoneOk &&
    paymentOk &&
    emailOk &&
    lines.length > 0 &&
    !hasProblem &&
    !submitting;

  const header = (
    <StorefrontHeader
      businessName={business.name}
      logoUrl={business.logoUrl}
      tagline={typeof appearance.headerTagline === "string" ? appearance.headerTagline : ""}
      headerBrand={typeof appearance.headerBrand === "string" ? appearance.headerBrand : "logo_name"}
      headerAlignment={theme.headerAlignment}
      menuStyle={theme.menuStyle as "bar" | "minimal" | "pills"}
      menuPosition={theme.menuPosition as "left" | "center" | "right"}
      menuVisibility="always"
      showActions={false}
      navItems={[
        { label: "Home", href: home },
        { label: "Track order", href: `${home}/track` },
      ]}
    />
  );

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    trackStoreEvent("order_submit", { businessSlug: slug });
    try {
      const order = await postStorefrontOrder({
        slug,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || undefined,
        customerNote: note || undefined,
        deliveryMethod: method,
        deliveryAddress: method === "delivery" ? address : undefined,
        deliveryZone: method === "delivery" && zone ? zone.name : undefined,
        paymentMethod: payment,
        items: lines.map((row) => ({
          productId: row.line.productId,
          quantity: row.line.quantity,
          variants: row.line.variants,
        })),
      });
      myOrders.remember({
        code: order.trackingCode ?? order.orderRef,
        slug,
        businessName: business.name,
        total: order.total,
        currency: order.currency,
        placedAt: new Date().toISOString(),
      });
      cart.clear();
      if (order.paymentMethod === "online") {
        if (order.paymentUrl) {
          window.location.assign(order.paymentUrl);
          return;
        }
        toast.error(order.paymentError ?? "Could not open the payment page.");
        window.location.assign(`/store/${slug}/checkout?ref=${encodeURIComponent(order.trackingCode ?? order.orderRef)}`);
        return;
      }
      setPlaced({ order, name, phone, method });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not place your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Back from the payment page ----------
  if (returnRef) {
    return (
      <div className={styles.page} style={theme.style as React.CSSProperties}>
        <Helmet>
          <title>{`Payment — ${business.name}`}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        {header}
        <OrderPaymentReturn slug={slug} orderRef={returnRef} home={home} />
      </div>
    );
  }

  // ---------- Confirmation ----------
  if (placed) {
    const { order } = placed;
    const copy = (text: string, done: string) => {
      void navigator.clipboard
        .writeText(text)
        .then(() => toast.success(done))
        .catch(() => toast.error("Could not copy."));
    };
    const details: string[] = [`Order reference: ${order.orderRef}`];
    if (order.deliveryZone && order.deliveryZone !== "Pickup") {
      details.push(`Delivery area: ${order.deliveryZone}`);
    }
    if (placed.method === "pickup") details.push("I will pick this up.");
    if (order.deliveryFee > 0) {
      details.push(`Delivery fee: ${formatMoney(order.deliveryFee, order.currency)}`);
    }
    details.push(`Total: ${formatMoney(order.total, order.currency)}`);
    if (order.paymentMethod) details.push(`Payment: ${PAYMENT_COPY[order.paymentMethod].label}`);
    if (order.trackingCode) {
      details.push(`Track it: ${window.location.origin}/${business.slug}/track/${order.trackingCode}`);
    }
    const whatsappUrl = whatsappNumber
      ? buildWhatsAppOrderUrl({
          businessName: business.name,
          whatsappNumber,
          currency: order.currency,
          customerName: placed.name,
          customerPhone: placed.phone,
          note: details.join("\n"),
          items: order.lines.map((line) => ({
            name: line.variantLabel ? `${line.name} (${line.variantLabel})` : line.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        })
      : null;

    return (
      <div className={styles.page} style={theme.style as React.CSSProperties}>
        <Helmet>
          <title>{`Order placed — ${business.name}`}</title>
        </Helmet>
        {header}
        <main className={styles.confirm}>
          <div className={styles.confirmIcon}>
            <Check size={28} />
          </div>
          <h1 className={styles.title}>Thank you, {placed.name.split(" ")[0]}!</h1>
          <p className={styles.muted}>
            Your order has been sent to {business.name}. They will contact you to confirm.
          </p>

          <div className={styles.refRow}>
            <span>Order reference</span>
            <code className={styles.code}>{order.orderRef}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copy(order.orderRef, "Reference copied.")}
            >
              <Copy size={14} /> Copy
            </Button>
          </div>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Order summary</h2>
            <ul className={styles.summaryList}>
              {order.lines.map((line, index) => (
                <li key={index} className={styles.summaryItem}>
                  <span>
                    {line.quantity} × {line.name}
                    {line.variantLabel && (
                      <span className={styles.variantNote}> · {line.variantLabel}</span>
                    )}
                  </span>
                  <span>{formatMoney(line.lineTotal, order.currency)}</span>
                </li>
              ))}
            </ul>
            <div className={styles.totals}>
              <div><span>Subtotal</span><span>{formatMoney(order.subtotal, order.currency)}</span></div>
              <div>
                <span>{placed.method === "pickup" ? "Pickup" : "Delivery"}</span>
                <span>{order.deliveryFee > 0 ? formatMoney(order.deliveryFee, order.currency) : "Free"}</span>
              </div>
              <div className={styles.grand}><span>Total</span><span>{formatMoney(order.total, order.currency)}</span></div>
            </div>
          </section>

          {order.paymentMethod === "bank_transfer" && order.bank && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}><Landmark size={16} /> Pay by bank transfer</h2>
              <dl className={styles.bank}>
                {order.bank.bankName && (<><dt>Bank</dt><dd>{order.bank.bankName}</dd></>)}
                {order.bank.accountName && (<><dt>Account name</dt><dd>{order.bank.accountName}</dd></>)}
                <dt>Account number</dt>
                <dd>
                  <strong>{order.bank.accountNumber}</strong>{" "}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Copy account number"
                    onClick={() => copy(order.bank?.accountNumber ?? "", "Account number copied.")}
                  >
                    <Copy size={14} />
                  </Button>
                </dd>
                <dt>Amount</dt>
                <dd><strong>{formatMoney(order.total, order.currency)}</strong></dd>
              </dl>
              <p className={styles.muted}>
                Use <strong>{order.orderRef}</strong> as the payment reference, then send your
                proof of payment on WhatsApp.
              </p>
            </section>
          )}
          {order.paymentMethod === "cash_on_delivery" && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}><Banknote size={16} /> Pay on delivery</h2>
              <p className={styles.muted}>
                Have {formatMoney(order.total, order.currency)} ready when your order arrives.
              </p>
            </section>
          )}
          {order.paymentMethod === "pay_on_pickup" && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}><Store size={16} /> Pay on pickup</h2>
              <p className={styles.muted}>
                Pay {formatMoney(order.total, order.currency)} when you collect your order.
                {checkout.pickupNote ? ` ${checkout.pickupNote}` : ""}
              </p>
            </section>
          )}

          <div className={styles.actions}>
            {whatsappUrl && (
              <Button asChild size="lg">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={17} /> Send order details on WhatsApp
                </a>
              </Button>
            )}
            {order.trackingCode && (
              <Button asChild variant="outline" size="lg">
                <Link to={`/${business.slug}/track/${order.trackingCode}`}>
                  <PackageCheck size={17} /> Track this order
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link to={home}>Continue shopping</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ---------- Empty cart ----------
  if (cart.items.length === 0) {
    return (
      <div className={styles.page} style={theme.style as React.CSSProperties}>
        {header}
        <main className={styles.confirm}>
          <h1 className={styles.title}>Your cart is empty</h1>
          <p className={styles.muted}>Add something from {business.name} to check out.</p>
          <Button asChild>
            <Link to={home}><ArrowLeft size={16} /> Back to the shop</Link>
          </Button>
        </main>
      </div>
    );
  }

  // ---------- Checkout ----------
  return (
    <div className={styles.page} style={theme.style as React.CSSProperties}>
      <Helmet>
        <title>{`Checkout — ${business.name}`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      {header}
      <main className={styles.main}>
        <Link to={home} className={styles.back}>
          <ArrowLeft size={16} /> Keep shopping
        </Link>
        <h1 className={styles.title}>Checkout</h1>

        <div className={styles.layout}>
          <div className={styles.formCol}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>1. Your details</h2>
              <div className={styles.fields}>
                <label className={styles.field}>
                  <span>Full name</span>
                  <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your name" />
                </label>
                <label className={styles.field}>
                  <span>Phone / WhatsApp number</span>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="0803 000 0000" />
                </label>
                <label className={styles.field}>
                  <span>{payment === "online" ? "Email (needed to pay online)" : "Email (optional)"}</span>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="you@example.com" />
                </label>
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>2. Delivery</h2>
              {deliveryOn && pickupOn && (
                <RadioGroup
                  value={method}
                  onValueChange={(value) => setMethodChoice(value as Method)}
                  className={styles.options}
                >
                  <label className={`${styles.option} ${method === "delivery" ? styles.optionOn : ""}`}>
                    <RadioGroupItem value="delivery" />
                    <span className={styles.optionText}><strong><Truck size={15} /> Delivery</strong><small>We bring it to you</small></span>
                  </label>
                  <label className={`${styles.option} ${method === "pickup" ? styles.optionOn : ""}`}>
                    <RadioGroupItem value="pickup" />
                    <span className={styles.optionText}><strong><Store size={15} /> Pickup</strong><small>Collect from the shop</small></span>
                  </label>
                </RadioGroup>
              )}

              {method === "delivery" ? (
                <div className={styles.fields}>
                  {checkout.zones.length > 0 && (
                    <label className={styles.field}>
                      <span>Delivery area</span>
                      <Select value={zoneName} onValueChange={setZoneName}>
                        <SelectTrigger><SelectValue placeholder="Choose your area" /></SelectTrigger>
                        <SelectContent>
                          {checkout.zones.map((item) => (
                            <SelectItem key={item.name} value={item.name}>
                              {item.name} — {item.fee === 0 ? "Free" : formatMoney(item.fee, business.currency)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                  )}
                  <label className={styles.field}>
                    <span>Delivery address</span>
                    <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} autoComplete="street-address" placeholder="House number, street, landmark" />
                  </label>
                  {checkout.deliveryNote && <p className={styles.muted}>{checkout.deliveryNote}</p>}
                  {freeOver !== null && (
                    <p className={styles.promo}>
                      {subtotal >= freeOver
                        ? "You qualify for free delivery."
                        : `Spend ${formatMoney(freeOver - subtotal, business.currency)} more for free delivery.`}
                    </p>
                  )}
                </div>
              ) : (
                <p className={styles.muted}>
                  {checkout.pickupNote || business.address || "Collect your order from the shop."}
                </p>
              )}
            </section>

            {paymentOptions.length > 0 && (
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>3. Payment</h2>
                <RadioGroup
                  value={payment ?? ""}
                  onValueChange={(value) => setPaymentChoice(value as OrderPaymentMethod)}
                  className={styles.options}
                >
                  {paymentOptions.map((option) => (
                    <label key={option} className={`${styles.option} ${payment === option ? styles.optionOn : ""}`}>
                      <RadioGroupItem value={option} />
                      <span className={styles.optionText}>
                        <strong>{option === "online" && <CreditCard size={15} />} {PAYMENT_COPY[option].label}</strong>
                        <small>{PAYMENT_COPY[option].hint}</small>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </section>
            )}

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>{paymentOptions.length > 0 ? "4." : "3."} Note for the shop (optional)</h2>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Anything the shop should know?" />
            </section>
          </div>

          <aside className={styles.summaryCol}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Order summary</h2>
              <ul className={styles.items}>
                {lines.map((row) => (
                  <li key={row.line.lineId} className={styles.item}>
                    <div className={styles.thumb}>
                      {row.line.imageUrl ? <img src={row.line.imageUrl} alt="" loading="lazy" /> : <ImageOff size={16} />}
                    </div>
                    <div className={styles.itemBody}>
                      <span className={styles.itemName}>{row.line.name}</span>
                      {row.line.variantLabel && <span className={styles.variantNote}>{row.line.variantLabel}</span>}
                      {row.problem && <span className={styles.problem}>{row.problem}</span>}
                      <div className={styles.itemControls}>
                        <div className={styles.stepper}>
                          <Button variant="outline" size="icon-sm" aria-label={`Reduce ${row.line.name}`} onClick={() => cart.setQuantity(row.line.lineId, row.line.quantity - 1)}><Minus size={13} /></Button>
                          <span>{row.line.quantity}</span>
                          <Button variant="outline" size="icon-sm" aria-label={`Add another ${row.line.name}`} disabled={typeof row.line.maxQuantity === "number" && row.line.quantity >= row.line.maxQuantity} onClick={() => cart.setQuantity(row.line.lineId, row.line.quantity + 1)}><Plus size={13} /></Button>
                        </div>
                        <strong>{formatMoney(row.price * row.line.quantity, business.currency)}</strong>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className={styles.totals}>
                <div><span>Subtotal</span><span>{formatMoney(subtotal, business.currency)}</span></div>
                <div>
                  <span>{method === "pickup" ? "Pickup" : "Delivery"}</span>
                  <span>
                    {method === "pickup"
                      ? "Free"
                      : checkout.zones.length > 0 && !zone
                        ? "Choose area"
                        : deliveryFee > 0 ? formatMoney(deliveryFee, business.currency) : "Free"}
                  </span>
                </div>
                <div className={styles.grand}><span>Total</span><span>{formatMoney(total, business.currency)}</span></div>
              </div>
              <Button size="lg" className={styles.placeButton} disabled={!canSubmit} onClick={() => void submit()}>
                {submitting ? <Spinner size="sm" /> : <Check size={17} />}
                Place order · {formatMoney(total, business.currency)}
              </Button>
              {!canSubmit && !submitting && (
                <p className={styles.muted}>
                  {hasProblem
                    ? "Fix the highlighted items above to continue."
                    : "Fill in your details and delivery to place the order."}
                </p>
              )}
              {checkout.returnPolicy && (
                <details className={styles.policy}>
                  <summary>Returns &amp; refunds</summary>
                  <p>{checkout.returnPolicy}</p>
                </details>
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default CheckoutPage;

