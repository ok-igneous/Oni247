import { useEffect, useRef, useState } from "react";
import { useNextSearchParams as useSearchParams } from "../helpers/useNextSearchParams";
import { Helmet } from "react-helmet";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/Dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { formatMoney } from "../helpers/formatMoney";
import { FEATURES } from "../helpers/features";
import { friendlyError } from "../helpers/friendlyError";
import {
  SUBSCRIPTION_QUERY_KEY,
  useSubscriptionStatus,
} from "../helpers/useSubscriptionStatus";
import { postSubscriptionCheckout } from "../endpoints/subscription/checkout_POST.schema";
import { postVerifySubscription } from "../endpoints/subscription/verify_POST.schema";
import styles from "./dashboard.plan.module.css";

const QUICK_MONTHS = [1, 3, 6, 12, 24];

const featureLines = (plan: { features: string[]; productLimit: number | null }) => [
  plan.productLimit === null ? "Unlimited products" : `Up to ${plan.productLimit} products`,
  ...plan.features.map((id): string | undefined => FEATURES.find((f) => f.id === id)?.label).filter((x): x is string => Boolean(x)),
];

const describeDuration = (months: number) => {
  if (months % 12 === 0) return `${months / 12} ${months === 12 ? "year" : "years"}`;
  return `${months} ${months === 1 ? "month" : "months"}`;
};

const PlanPage = () => {
  const { data, isFetching, error } = useSubscriptionStatus();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [starting, setStarting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [months, setMonths] = useState(1);
  const handledRef = useRef(false);

  // Flutterwave sends the customer back here with the result in the query
  // string. It is only a hint — the server re-checks with Flutterwave.
  useEffect(() => {
    if (handledRef.current) return;
    const txRef = searchParams.get("tx_ref");
    const transactionId = searchParams.get("transaction_id");
    const status = searchParams.get("status");
    if (!txRef) return;

    handledRef.current = true;

    if (!transactionId || status === "cancelled") {
      toast.error("Payment was not completed.");
      setSearchParams({}, { replace: true });
      return;
    }

    setVerifying(true);
    postVerifySubscription({ txRef, transactionId })
      .then((result) => {
        if (result.activated) toast.success(result.message);
        else toast.message(result.message);
        void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: ["business", "me"] });
      })
      .catch((err: unknown) => {
        toast.error(friendlyError(err, "Could not confirm the payment."));
      })
      .finally(() => {
        setVerifying(false);
        setSearchParams({}, { replace: true });
      });
  }, [searchParams, setSearchParams, queryClient]);

  const startCheckout = async () => {
    if (!chosen) return;
    setStarting(true);
    try {
      const { paymentLink } = await postSubscriptionCheckout({
        websitePlan: chosen,
        durationMonths: months,
      });
      // Flutterwave is an external checkout URL; router navigation treats it
      // as an in-app route and can leave the customer on the plan page.
      window.location.assign(paymentLink);
    } catch (err) {
      toast.error(friendlyError(err, "Could not start the payment. Please try again."));
      setStarting(false);
    }
  };

  if (isFetching && !data) {
    return (
      <div className={styles.page}>
        <Skeleton className={styles.skeletonTitle} />
        <Skeleton className={styles.skeletonBlock} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Plan</h1>
        <p className={styles.errorText}>{friendlyError(error, "Could not load your plan.")}</p>
      </div>
    );
  }

  const promoPercent = data.registrationPromoPercent ?? 50;
  const promoMultiplier = data.registrationPromoAvailable ? 1 - promoPercent / 100 : 1;
  const paidPlans = data.plans ?? [];
  const plan = chosen ? (paidPlans.find((p) => p.id === chosen) ?? null) : null;
  const maxMonths = data.maxDurationMonths ?? 24;
  const fullPrice = plan ? plan.priceMonthlyNgn * months : 0;
  const payable = fullPrice * promoMultiplier;

  const choose = (value: string) => {
    setMonths(1);
    setChosen(value);
  };

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Plan — Oni247</title>
      </Helmet>

      <div className={styles.head}>
        <h1 className={styles.title}>Plan</h1>
        <Badge variant={data.isPremium ? "success" : "secondary"}>
          {data.source === "trial" ? `${data.planName ?? "Premium"} trial` : data.isPremium ? (data.planName ?? "Paid") : "Free"}
        </Badge>
      </div>

      {data.source === "trial" && (
        <p className={styles.notice}>
          Your one-time {data.planName ?? "Premium"} trial has {data.trialDaysLeft}{" "}
          {data.trialDaysLeft === 1 ? "day" : "days"} left. When it expires,
          your account returns to the Free plan. Your existing content stays saved.
        </p>
      )}

      {data.lapsed && (
        <p className={styles.notice}>
          Your subscription has expired. Your products are all still here —
          renew to list new ones again.
        </p>
      )}

      {data.productLimit !== null && (
        <p className={styles.usage}>
          Using {data.productCount} of {data.productLimit} products.
        </p>
      )}

      {data.source === "paid" && data.renewsAt && (
        <p className={styles.usage}>
          {data.planName ?? "Your plan"} runs until {new Date(data.renewsAt).toLocaleDateString()}.
        </p>
      )}

      {data.registrationPromoAvailable && (
        <p className={styles.promoNote}>Registration promo: {promoPercent}% off your first paid subscription.</p>
      )}

      <div className={styles.plans}>
        <section className={styles.plan}>
          <h2 className={styles.planName}>{data.freePlan?.name ?? "Free"}</h2>
          <div className={styles.priceRow}>
            <span className={styles.planPrice}>₦0</span>
            <span className={styles.period}>always available</span>
          </div>
          <span className={styles.launchNote}>Your account returns to Free when a trial or paid plan expires.</span>
          <ul className={styles.features}>
            {featureLines(data.freePlan ?? { features: [], productLimit: data.productLimit }).map((feature) => (
              <li key={feature} className={styles.feature}>
                <Check size={15} className={styles.featureIcon} />
                {feature}
              </li>
            ))}
          </ul>
          {data.premiumTrialUsed && <span className={styles.launchNote}>{data.source === "trial" ? "Your one-time trial is active and cannot be restarted." : "Your one-time trial has already been used."}</span>}
        </section>

        {paidPlans.map((p) => (
          <section key={p.id} className={`${styles.plan} ${p.highlighted ? styles.planHighlight : ""}`}>
            <h2 className={styles.planName}>{p.name}</h2>
            <div className={styles.priceRow}>
              <span className={styles.planPrice}>{formatMoney(p.priceMonthlyNgn * promoMultiplier, "NGN")}</span>
              <span className={styles.period}>a month</span>
            </div>
            <span className={styles.launchNote}>{p.description}</span>
            <ul className={styles.features}>
              {featureLines(p).map((feature) => (
                <li key={feature} className={styles.feature}>
                  <Check size={15} className={styles.featureIcon} />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              className={styles.upgradeButton}
              disabled={starting || verifying || !data.paymentsConfigured}
              onClick={() => choose(p.id)}
            >
              {verifying ? "Confirming payment" : data.planId === p.id && data.source === "paid" ? `Renew ${p.name}` : `Choose ${p.name}`}
            </Button>
            {!data.paymentsConfigured && (
              <span className={styles.launchNote}>Payments are not connected yet.</span>
            )}
            <span className={styles.launchNote}>Paying early adds the time you choose to your existing subscription.</span>
          </section>
        ))}
      </div>

      <Dialog open={chosen !== null} onOpenChange={(open) => !open && !starting && setChosen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{plan ? `Get ${plan.name}` : "Choose a plan"}</DialogTitle>
            <DialogDescription>How long would you like to pay for?</DialogDescription>
          </DialogHeader>

          <div className={styles.quick} role="radiogroup" aria-label="Subscription length">
            {QUICK_MONTHS.filter((value) => value <= maxMonths).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={months === value}
                className={`${styles.quickOption} ${months === value ? styles.quickOn : ""}`}
                onClick={() => setMonths(value)}
              >
                {describeDuration(value)}
              </button>
            ))}
          </div>

          <div className={styles.custom}>
            <span className={styles.launchNote}>Or choose another number of months (up to {maxMonths})</span>
            <Select value={String(months)} onValueChange={(value) => setMonths(Number(value))}>
              <SelectTrigger aria-label="Number of months"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxMonths }, (_, index) => index + 1).map((value) => (
                  <SelectItem key={value} value={String(value)}>{describeDuration(value)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>{plan?.name} × {describeDuration(months)}</span>
              <span>{formatMoney(fullPrice, "NGN")}</span>
            </div>
            {data.registrationPromoAvailable && (
              <div className={styles.summaryRow}>
                <span>Registration promo ({promoPercent}% off)</span>
                <span>−{formatMoney(fullPrice - payable, "NGN")}</span>
              </div>
            )}
            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>You pay</span>
              <span>{formatMoney(payable, "NGN")}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={starting} onClick={() => setChosen(null)}>Cancel</Button>
            <Button disabled={starting} onClick={() => void startCheckout()}>
              {starting ? <Spinner size="sm" /> : null}
              {starting ? "Opening payment…" : "Continue to payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanPage;
