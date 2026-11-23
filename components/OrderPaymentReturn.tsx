import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock, XCircle } from "lucide-react";
import { Button } from "./Button";
import { Spinner } from "./Spinner";
import { formatMoney } from "../helpers/formatMoney";
import { postStorefrontOrderPay, type OutputType } from "../endpoints/storefront/orderPay_POST.schema";
import styles from "./OrderPaymentReturn.module.css";

/** Shown when a customer comes back from the payment page. The gateway is asked directly, so the result can be trusted. */
export const OrderPaymentReturn = ({ slug, orderRef, home }: { slug: string; orderRef: string; home: string }) => {
  const [result, setResult] = useState<OutputType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const tries = useRef(0);

  useEffect(() => {
    let stop = false;
    const run = async () => {
      try {
        const next = await postStorefrontOrderPay({ slug, ref: orderRef, op: "check" });
        if (stop) return;
        setResult(next);
        setBusy(false);
        // Some gateways confirm a few seconds late: look again a couple of times.
        if (next.paymentStatus === "unpaid" && tries.current < 3) {
          tries.current += 1;
          setBusy(true);
          setTimeout(() => void run(), 3500);
        }
      } catch (e) {
        if (stop) return;
        setError(e instanceof Error ? e.message : "Could not check the payment.");
        setBusy(false);
      }
    };
    void run();
    return () => {
      stop = true;
    };
  }, [slug, orderRef]);

  const retry = async () => {
    setBusy(true);
    try {
      const next = await postStorefrontOrderPay({ slug, ref: orderRef, op: "start" });
      if (next.paymentStatus === "paid") setResult(next);
      else if (next.paymentUrl) window.location.assign(next.paymentUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the payment page.");
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <main className={styles.wrap}>
        <div className={`${styles.icon} ${styles.bad}`}><XCircle size={28} /></div>
        <h1>We could not check your payment</h1>
        <p>{error}</p>
        <div className={styles.actions}><Button asChild variant="outline"><Link to={home}>Back to the shop</Link></Button></div>
      </main>
    );
  }
  if (!result) {
    return (
      <main className={styles.wrap}>
        <Spinner size="lg" />
        <p>Checking your payment…</p>
      </main>
    );
  }
  const paid = result.paymentStatus === "paid";
  return (
    <main className={styles.wrap}>
      <div className={`${styles.icon} ${paid ? styles.ok : result.paymentStatus === "failed" ? styles.bad : ""}`}>
        {paid ? <Check size={28} /> : result.paymentStatus === "failed" ? <XCircle size={28} /> : <Clock size={28} />}
      </div>
      <h1>{paid ? "Payment received" : result.paymentStatus === "failed" ? "Payment did not go through" : busy ? "Confirming your payment…" : "Payment not confirmed yet"}</h1>
      <p>
        {paid
          ? `Thank you! ${result.businessName} has your payment of ${formatMoney(result.total, result.currency)} and will contact you about your order.`
          : `Your order is saved with ${result.businessName}. You can pay ${formatMoney(result.total, result.currency)} now, or contact the shop.`}
      </p>
      <span className={styles.code}>{result.orderRef}</span>
      <div className={styles.actions}>
        {!paid && <Button disabled={busy} onClick={() => void retry()}>{busy ? <Spinner size="sm" /> : null} Pay now</Button>}
        <Button asChild variant={paid ? "primary" : "ghost"}><Link to={home}>Continue shopping</Link></Button>
      </div>
    </main>
  );
};

