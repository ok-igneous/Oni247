"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Lock } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { formatMoney } from "../helpers/formatMoney";
import { getPayInfo } from "../endpoints/pay/info_GET.schema";
import { getPayStatus, type OutputType as StatusOutput } from "../endpoints/pay/status_GET.schema";
import { postPayStart } from "../endpoints/pay/start_POST.schema";
import styles from "./pay.$code.module.css";

export default function PayPage({ code, ref }: { code: string; ref: string | null }) {
  const router = useRouter();
  const info = useQuery({ queryKey: ["pay", code], queryFn: () => getPayInfo(code), retry: false });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StatusOutput | null>(null);
  const [checking, setChecking] = useState(Boolean(ref));

  // Coming back from the gateway: ask the server, which asks the gateway.
  useEffect(() => {
    if (!ref) return;
    let tries = 0;
    let stopped = false;
    const check = async () => {
      try {
        const r = await getPayStatus(ref);
        if (stopped) return;
        setResult(r);
        if (r.status === "pending" && tries++ < 4) setTimeout(() => void check(), 3000);
        else setChecking(false);
      } catch {
        if (!stopped) setChecking(false);
      }
    };
    void check();
    return () => {
      stopped = true;
    };
  }, [ref]);

  const data = info.data;
  const open = data?.amount === null;

  const pay = async () => {
    setError(null);
    const typed = Number(amount.replace(/[^0-9.]/g, ""));
    if (open && !(typed > 0)) return setError("Enter the amount you want to pay.");
    setBusy(true);
    try {
      const { url } = await postPayStart({ code, name, email, phone: phone || undefined, amount: open ? typed : undefined });
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the payment.");
      setBusy(false);
    }
  };

  const retry = () => {
    setResult(null);
    router.replace(`/pay/${encodeURIComponent(code)}`);
  };

  return (
    <div className={styles.page}>
      
      <div className={styles.card}>
        {info.isLoading ? (
          <Skeleton style={{ height: 220 }} />
        ) : info.error || !data ? (
          <>
            <h1>Link not found</h1>
            <p className={styles.muted}>This payment link does not exist or was removed.</p>
          </>
        ) : (
          <>
            <div className={styles.brand}>
              {data.business.logoUrl && <img src={data.business.logoUrl} alt="" className={styles.logo} />}
              <span>{data.business.name}</span>
            </div>
            <h1>{data.title}</h1>
            {data.description && <p className={styles.muted}>{data.description}</p>}

            {checking && !result ? (
              <p className={styles.muted}>Confirming your payment…</p>
            ) : result?.status === "paid" ? (
              <div className={styles.done}>
                <CheckCircle2 size={34} />
                <h2>Payment received</h2>
                <p className={styles.muted}>{formatMoney(result.amount, result.currency)} paid to {data.business.name}. A receipt may follow from your payment provider.</p>
                <Link href={`/${data.business.slug}`} className={styles.link}>Back to {data.business.name}</Link>
              </div>
            ) : (
              <>
                {result?.status === "failed" && <p className={styles.error}>That payment did not go through. You can try again.</p>}
                {result?.status === "pending" && <p className={styles.error}>We have not received confirmation yet. If you were charged, it will update shortly. You can also try again.</p>}
                {!data.available ? (
                  <p className={styles.error}>Online payment is not available for this link right now.{data.business.whatsappNumber ? " Please contact the business directly." : ""}</p>
                ) : (
                  <>
                    <div className={styles.amount}>{open ? "Choose your amount" : formatMoney(data.amount ?? 0, data.currency)}</div>
                    <div className={styles.fields}>
                      {open && <label className={styles.field}><span>Amount ({data.currency})</span><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></label>}
                      <label className={styles.field}><span>Your name</span><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
                      <label className={styles.field}><span>Email for your receipt</span><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
                      <label className={styles.field}><span>Phone (optional)</span><Input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" /></label>
                    </div>
                    {error && <p className={styles.error}>{error}</p>}
                    <Button size="lg" disabled={busy || !name.trim() || !email.trim()} onClick={() => void pay()}>{busy ? "Opening secure payment…" : open ? "Continue to payment" : `Pay ${formatMoney(data.amount ?? 0, data.currency)}`}</Button>
                    {result && <button type="button" className={styles.link} onClick={retry}>Start a new payment</button>}
                    <p className={styles.secure}><Lock size={13} /> Paid on the secure page of {data.business.name}'s payment provider.</p>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
