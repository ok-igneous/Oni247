import { useEffect, useRef, useState } from "react";
import { useNextSearchParams as useSearchParams } from "../helpers/useNextSearchParams";
import { Helmet } from "react-helmet";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/Dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Switch } from "../components/Switch";
import { PageHead, Panel } from "../components/Panel";
import { SectionLayout, useSection, type SectionItem } from "../components/SectionLayout";
import { formatMoney } from "../helpers/formatMoney";
import { friendlyError } from "../helpers/friendlyError";
import { useAddons, useToggleAddon } from "../helpers/useAddons";
import type { AddonId } from "../helpers/addons";
import type { AddonItem } from "../endpoints/addons/list_GET.schema";
import { postSubscriptionCheckout } from "../endpoints/subscription/checkout_POST.schema";
import { postVerifySubscription } from "../endpoints/subscription/verify_POST.schema";
import styles from "./dashboard.addons.module.css";

const viaLabel = (item: AddonItem) =>
  item.via === "plan" ? "Included in your plan" : item.via === "purchase" ? (item.expiresAt ? `Paid until ${new Date(item.expiresAt).toLocaleDateString()}` : "Purchased") : item.via === "free" ? "Free" : "";

export default function AddonsPage() {
  const { data, isFetching, error } = useAddons();
  const toggle = useToggleAddon();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const handled = useRef(false);
  const [buying, setBuying] = useState<AddonItem | null>(null);
  const [months, setMonths] = useState(1);
  const [starting, setStarting] = useState(false);

  const items = data?.items ?? [];
  const mine = items.filter((i) => i.entitled);
  const more = items.filter((i) => !i.entitled);
  const sections: SectionItem[] = [
    { id: "mine", label: "My add-ons", hint: "Switch features on or off", badge: mine.length },
    { id: "more", label: "Get more", hint: "Add features to your plan", badge: more.length },
  ];
  const [section, setSection] = useSection(sections);

  // Flutterwave sends the shop back here after paying for an add-on.
  useEffect(() => {
    if (handled.current) return;
    const txRef = params.get("tx_ref");
    if (!txRef) return;
    handled.current = true;
    const transactionId = params.get("transaction_id");
    if (!transactionId || params.get("status") === "cancelled") {
      toast.error("Payment was not completed.");
      setParams({}, { replace: true });
      return;
    }
    postVerifySubscription({ txRef, transactionId })
      .then((r) => (r.activated ? toast.success(r.message) : toast.message(r.message)))
      .catch((e: unknown) => toast.error(friendlyError(e, "Could not confirm the payment.")))
      .finally(() => {
        void queryClient.invalidateQueries({ queryKey: ["addons"] });
        setParams({}, { replace: true });
      });
  }, [params, setParams, queryClient]);

  const change = (id: AddonId, enabled: boolean) => {
    toggle.mutate(
      { id, enabled },
      {
        onSuccess: () => toast.success(enabled ? "Add-on switched on. It now shows in your menu." : "Add-on switched off. Your content is kept."),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the add-on."),
      },
    );
  };

  const pay = async () => {
    if (!buying) return;
    setStarting(true);
    try {
      const { paymentLink } = await postSubscriptionCheckout({ websitePlan: `addon:${buying.id}`, durationMonths: months });
      window.location.assign(paymentLink);
    } catch (e) {
      toast.error(friendlyError(e, "Could not start the payment."));
      setStarting(false);
    }
  };

  if (isFetching && !data) return <div className={styles.page}><Skeleton style={{ height: 240 }} /></div>;
  if (error || !data) return <div className={styles.page}><h1>Add-ons</h1><p>Could not load add-ons. Please try again.</p></div>;

  const maxMonths = data.maxDurationMonths ?? 12;
  const price = (buying?.priceMonthlyNgn ?? 0) * months;

  return (
    <div className={styles.page}>
      <Helmet><title>Add-ons — Oni247</title></Helmet>
      <PageHead title="Add-ons" lead="Switch on only the features you use. Switching one off hides it from your menu and keeps everything you created." />
      <SectionLayout title="Add-ons" items={sections} value={section} onChange={setSection}>
        {section === "mine" ? (
          <Panel title="My add-ons" desc="Included in your plan, free, or already paid for.">
            {mine.length === 0 ? (
              <p className={styles.empty}>No add-ons are available on your plan yet. Open Get more to see what you can add.</p>
            ) : (
              <div className={styles.list}>
                {mine.map((item) => (
                  <div className={styles.row} key={item.id}>
                    <div>
                      <div className={styles.title}>
                        {item.name}
                        <Badge variant={item.via === "free" ? "success" : "outline"}>{viaLabel(item)}</Badge>
                        {item.comingSoon && <Badge variant="secondary">Coming soon</Badge>}
                      </div>
                      <p className={styles.desc}>{item.description}</p>
                    </div>
                    <Switch checked={item.enabled} disabled={toggle.isPending || item.comingSoon} onCheckedChange={(c) => change(item.id, c)} aria-label={`${item.name} add-on`} />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        ) : (
          <Panel title="Get more" desc="Add a feature to your shop without changing plan, or upgrade to a plan that includes it.">
            {more.length === 0 ? (
              <p className={styles.empty}>You already have every available add-on.</p>
            ) : (
              <div className={styles.list}>
                {more.map((item) => (
                  <div className={styles.row} key={item.id}>
                    <div>
                      <div className={styles.title}>
                        {item.name}
                        {(item.priceMonthlyNgn ?? 0) > 0 && <Badge variant="warning">{formatMoney(item.priceMonthlyNgn ?? 0, "NGN")} / month</Badge>}
                        {item.comingSoon && <Badge variant="secondary">Coming soon</Badge>}
                      </div>
                      <p className={styles.desc}>{item.description}</p>
                      {(item.includedIn?.length ?? 0) > 0 && <p className={styles.lock}>Included in {item.includedIn?.join(", ")}.</p>}
                    </div>
                    <div className={styles.buy}>
                      {(item.priceMonthlyNgn ?? 0) > 0 && !item.comingSoon && (
                        <Button size="sm" disabled={!data.paymentsConfigured} onClick={() => { setMonths(1); setBuying(item); }}>Add for {formatMoney(item.priceMonthlyNgn ?? 0, "NGN")}</Button>
                      )}
                      {(item.includedIn?.length ?? 0) > 0 && <Button size="sm" variant="outline" onClick={() => (window.location.href = "/dashboard/plan")}>See plans</Button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!data.paymentsConfigured && <p className={styles.note}>Payments are not connected yet, so paid add-ons cannot be bought right now.</p>}
          </Panel>
        )}
      </SectionLayout>

      <Dialog open={buying !== null} onOpenChange={(open) => !open && !starting && setBuying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {buying?.name}</DialogTitle>
            <DialogDescription>It runs for the months you pay for. Pay again before it ends to keep it.</DialogDescription>
          </DialogHeader>
          <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
            <SelectTrigger aria-label="Number of months"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: maxMonths }, (_, i) => i + 1).map((v) => <SelectItem key={v} value={String(v)}>{v} {v === 1 ? "month" : "months"}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className={styles.total}>You pay <strong>{formatMoney(price, "NGN")}</strong></p>
          <DialogFooter>
            <Button variant="outline" disabled={starting} onClick={() => setBuying(null)}>Cancel</Button>
            <Button disabled={starting} onClick={() => void pay()}>{starting ? <Spinner size="sm" /> : null}{starting ? "Opening payment…" : "Continue to payment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

