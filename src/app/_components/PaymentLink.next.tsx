"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Lock } from "lucide-react";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/Input";
import { Skeleton } from "../../../components/Skeleton";
import { formatMoney } from "../../../helpers/formatMoney";
import { getPayInfo, type PayInfo } from "../../../endpoints/pay/info_GET.schema";
import { getPayStatus, type OutputType as StatusOutput } from "../../../endpoints/pay/status_GET.schema";
import { postPayStart } from "../../../endpoints/pay/start_POST.schema";
import styles from "./PaymentLink.module.css";

type Props = { code: string };

export default function PaymentLinkNext({ code }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const [data, setData] = useState<PayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StatusOutput | null>(null);
  const [checking, setChecking] = useState(Boolean(ref));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    void getPayInfo(code).then((value) => {
      if (active) setData(value);
    }).catch(() => {
      if (active) setLoadError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [code]);

  useEffect(() => {
    if (!ref) {
      setChecking(false);
      return;
    }
    let stopped = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    setChecking(true);
    const check = async () => {
      try {
        const status = await getPayStatus(ref);
        if (stopped) return;
        setResult(status);
        if (status.status === "pending" && tries++ < 4) {
          timeout = setTimeout(() => void check(), 3000);
        } else {
          setChecking(false);
        }
      } catch {
        if (!stopped) setChecking(false);
      }
    };
    void check();
    return () => {
      stopped = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [ref]);

  const openAmount = data?.amount === null;
  const pay = useCallback(async () => {
    setError(null);
    const typedAmount = Number(amount.replace(/[^0-9.]/g, ""));
    if (openAmount && !(typedAmount > 0)) {
      setError("Enter the amount you want to pay.");
      return;
    }
    setBusy(true);
    try {
      const response = await postPayStart({
        code,
        name,
        email,
        phone: phone || undefined,
        amount: openAmount ? typedAmount : undefined,
      });
      window.location.assign(response.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start the payment.");
      setBusy(false);
    }
  }, [amount, code, email, name, openAmount, phone]);

  const retry = () => {
    setResult(null);
    router.replace(`/pay/${encodeURIComponent(code)}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {loading ? (
          <Skeleton style={{ height: 220 }} />
        ) : loadError || !data ? (
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
                <p className={styles.muted}>
                  {formatMoney(result.amount, result.currency)} paid to {data.business.name}. A receipt may follow from your payment provider.
                </p>
                <Link href={`/${data.business.slug}`} className={styles.link}>Back to {data.business.name}</Link>
              </div>
            ) : (
              <>
                {result?.status === "failed" && <p className={styles.error}>That payment did not go through. You can try again.</p>}
                {result?.status === "pending" && <p className={styles.error}>We have not received confirmation yet. If you were charged, it will update shortly. You can also try again.</p>}
                {!data.available ? (
                  <p className={styles.error}>
                    Online payment is not available for this link right now.{data.business.whatsappNumber ? " Please contact the business directly." : ""}
                  </p>
                ) : (
                  <>
                    <div className={styles.amount}>
                      {openAmount ? "Choose your amount" : formatMoney(data.amount ?? 0, data.currency)}
                    </div>
                    <div className={styles.fields}>
                      {openAmount && (
                        <label className={styles.field}>
                          <span>Amount ({data.currency})</span>
                          <Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
                        </label>
                      )}
                      <label className={styles.field}>
                        <span>Your name</span>
                        <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
                      </label>
                      <label className={styles.field}>
                        <span>Email for your receipt</span>
                        <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
                      </label>
                      <label className={styles.field}>
                        <span>Phone (optional)</span>
                        <Input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" inputMode="tel" />
                      </label>
                    </div>
                    {error && <p className={styles.error}>{error}</p>}
                    <Button size="lg" disabled={busy || !name.trim() || !email.trim()} onClick={() => void pay()}>
                      {busy ? "Opening secure payment…" : openAmount ? "Continue to payment" : `Pay ${formatMoney(data.amount ?? 0, data.currency)}`}
                    </Button>
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
