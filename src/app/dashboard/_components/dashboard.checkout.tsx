"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Skeleton } from "../../../../components/Skeleton";
import { Spinner } from "../../../../components/Spinner";
import { Switch } from "../../../../components/Switch";
import { Textarea } from "../../../../components/Textarea";
import { parseCheckoutSettings } from "../../../../helpers/parseCheckoutSettings";
import { useMyBusiness } from "../../../../helpers/useMyBusiness";
import { useSaveCheckoutSettings } from "../../../../helpers/useSaveCheckoutSettings";
import styles from "./dashboard.checkout.module.css";

type ZoneDraft = { id: string; name: string; fee: string };

type Draft = {
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  pickupNote: string;
  zones: ZoneDraft[];
  freeDeliveryOver: string;
  deliveryNote: string;
  returnPolicy: string;
  cashOnDelivery: boolean;
  payOnPickup: boolean;
  bankTransfer: boolean;
  bankName: string;
  accountName: string;
  accountNumber: string;
};

const newId = () => `zone-${Math.random().toString(36).slice(2, 9)}`;

const CheckoutSettingsPage = () => {
  const { data, isFetching } = useMyBusiness();
  const save = useSaveCheckoutSettings();
  const [draft, setDraft] = useState<Draft | null>(null);

  const business = data?.business ?? null;

  useEffect(() => {
    if (!business || draft) return;
    const settings = parseCheckoutSettings(business.checkoutSettings);
    setDraft({
      deliveryEnabled: settings.deliveryEnabled,
      pickupEnabled: settings.pickupEnabled,
      pickupNote: settings.pickupNote,
      zones: settings.zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        fee: String(zone.fee),
      })),
      freeDeliveryOver:
        settings.freeDeliveryOver === null ? "" : String(settings.freeDeliveryOver),
      deliveryNote: settings.deliveryNote,
      returnPolicy: settings.returnPolicy,
      cashOnDelivery: settings.paymentMethods.cashOnDelivery,
      payOnPickup: settings.paymentMethods.payOnPickup,
      bankTransfer: settings.paymentMethods.bankTransfer,
      bankName: settings.bank.bankName,
      accountName: settings.bank.accountName,
      accountNumber: settings.bank.accountNumber,
    });
  }, [business, draft]);

  if ((isFetching && !data) || !draft) {
    return (
      <div className={styles.page}>
        <Skeleton className={styles.skeletonTitle} />
        <Skeleton className={styles.skeletonBlock} />
      </div>
    );
  }

  if (!business) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Delivery &amp; payment</h1>
        <p className={styles.subtitle}>Create your business page first, then come back here.</p>
      </div>
    );
  }

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  const handleSave = async () => {
    const zones: Array<{ id: string; name: string; fee: number }> = [];
    for (const zone of draft.zones) {
      if (!zone.name.trim() && !zone.fee.trim()) continue;
      const fee = zone.fee.trim() === "" ? 0 : Number.parseFloat(zone.fee);
      if (!zone.name.trim() || Number.isNaN(fee) || fee < 0) {
        toast.error("Give every delivery area a name and a fee in numbers.");
        return;
      }
      zones.push({ id: zone.id, name: zone.name.trim(), fee });
    }
    const freeText = draft.freeDeliveryOver.trim();
    const freeDeliveryOver = freeText === "" ? null : Number.parseFloat(freeText);
    if (freeDeliveryOver !== null && (Number.isNaN(freeDeliveryOver) || freeDeliveryOver < 0)) {
      toast.error("Free delivery amount must be a number, or leave it blank.");
      return;
    }
    try {
      await save.mutateAsync({
        deliveryEnabled: draft.deliveryEnabled,
        pickupEnabled: draft.pickupEnabled,
        pickupNote: draft.pickupNote,
        zones,
        freeDeliveryOver,
        deliveryNote: draft.deliveryNote,
        returnPolicy: draft.returnPolicy,
        paymentMethods: {
          cashOnDelivery: draft.cashOnDelivery,
          payOnPickup: draft.payOnPickup,
          bankTransfer: draft.bankTransfer,
        },
        bank: {
          bankName: draft.bankName,
          accountName: draft.accountName,
          accountNumber: draft.accountNumber,
        },
      });
      toast.success("Delivery and payment settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your settings.");
    }
  };

  return (
    <div className={styles.page}>
      

      <div>
        <h1 className={styles.title}>Delivery &amp; payment</h1>
        <p className={styles.subtitle}>
          What customers choose at checkout. Delivery fees are added to the order total
          automatically, and customers see your bank details only after they pick bank
          transfer and place the order.
        </p>
      </div>

      <section className={styles.card}>
        <div className={styles.switchRow}>
          <Switch
            id="delivery"
            checked={draft.deliveryEnabled}
            onCheckedChange={(checked) => set({ deliveryEnabled: checked })}
          />
          <label htmlFor="delivery" className={styles.switchLabel}>
            <span className={styles.label}>Offer delivery</span>
            <span className={styles.hint}>Customers enter an address and pick their area.</span>
          </label>
        </div>

        {draft.deliveryEnabled && (
          <>
            <div className={styles.field}>
              <span className={styles.label}>Delivery areas and fees</span>
              <span className={styles.hint}>
                Add an area for each fee you charge, for example &quot;Ikeja&quot; or &quot;Lekki
                &amp; Ajah&quot;. With no areas, delivery is free and you agree the cost with the
                customer.
              </span>
              <div className={styles.zoneList}>
                {draft.zones.map((zone, index) => (
                  <div key={zone.id} className={styles.zoneRow}>
                    <Input
                      value={zone.name}
                      onChange={(event) => {
                        const zones = [...draft.zones];
                        zones[index] = { ...zone, name: event.target.value };
                        set({ zones });
                      }}
                      placeholder="Area name"
                      aria-label="Area name"
                    />
                    <Input
                      value={zone.fee}
                      onChange={(event) => {
                        const zones = [...draft.zones];
                        zones[index] = { ...zone, fee: event.target.value };
                        set({ zones });
                      }}
                      placeholder="Fee (0 = free)"
                      inputMode="decimal"
                      aria-label="Delivery fee"
                      className={styles.feeInput}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove area"
                      onClick={() => set({ zones: draft.zones.filter((_, i) => i !== index) })}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => set({ zones: [...draft.zones, { id: newId(), name: "", fee: "" }] })}
                >
                  <Plus size={15} /> Add area
                </Button>
              </div>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Free delivery over (optional)</span>
              <Input
                value={draft.freeDeliveryOver}
                onChange={(event) => set({ freeDeliveryOver: event.target.value })}
                placeholder="50000"
                inputMode="decimal"
                className={styles.numberInput}
              />
              <span className={styles.hint}>
                Orders at or above this amount get free delivery. Leave blank for never.
              </span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Delivery note (optional)</span>
              <Input
                value={draft.deliveryNote}
                onChange={(event) => set({ deliveryNote: event.target.value })}
                placeholder="Delivered within 1–2 working days"
              />
            </label>
          </>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.switchRow}>
          <Switch
            id="pickup"
            checked={draft.pickupEnabled}
            onCheckedChange={(checked) => set({ pickupEnabled: checked })}
          />
          <label htmlFor="pickup" className={styles.switchLabel}>
            <span className={styles.label}>Offer pickup</span>
            <span className={styles.hint}>Customers collect from your shop, with no delivery fee.</span>
          </label>
        </div>
        {draft.pickupEnabled && (
          <label className={styles.field}>
            <span className={styles.label}>Pickup instructions (optional)</span>
            <Input
              value={draft.pickupNote}
              onChange={(event) => set({ pickupNote: event.target.value })}
              placeholder="Collect from our shop, Mon–Sat 9am–6pm"
            />
          </label>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Payment methods</h2>
        <div className={styles.switchRow}>
          <Switch
            id="cod"
            checked={draft.cashOnDelivery}
            onCheckedChange={(checked) => set({ cashOnDelivery: checked })}
          />
          <label htmlFor="cod" className={styles.switchLabel}>
            <span className={styles.label}>Pay on delivery</span>
          </label>
        </div>
        <div className={styles.switchRow}>
          <Switch
            id="pop"
            checked={draft.payOnPickup}
            onCheckedChange={(checked) => set({ payOnPickup: checked })}
          />
          <label htmlFor="pop" className={styles.switchLabel}>
            <span className={styles.label}>Pay on pickup</span>
          </label>
        </div>
        <div className={styles.switchRow}>
          <Switch
            id="bank"
            checked={draft.bankTransfer}
            onCheckedChange={(checked) => set({ bankTransfer: checked })}
          />
          <label htmlFor="bank" className={styles.switchLabel}>
            <span className={styles.label}>Bank transfer</span>
            <span className={styles.hint}>
              You confirm payment yourself and mark the order as paid. Oni247 does not move
              the money.
            </span>
          </label>
        </div>
        {draft.bankTransfer && (
          <div className={styles.bankFields}>
            <label className={styles.field}>
              <span className={styles.label}>Bank name</span>
              <Input value={draft.bankName} onChange={(event) => set({ bankName: event.target.value })} placeholder="GTBank" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Account name</span>
              <Input value={draft.accountName} onChange={(event) => set({ accountName: event.target.value })} placeholder="Your business name" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Account number</span>
              <Input value={draft.accountNumber} onChange={(event) => set({ accountNumber: event.target.value })} placeholder="0123456789" inputMode="numeric" className={styles.numberInput} />
            </label>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <label className={styles.field}>
          <span className={styles.label}>Returns &amp; refunds policy (optional)</span>
          <Textarea
            value={draft.returnPolicy}
            onChange={(event) => set({ returnPolicy: event.target.value })}
            rows={3}
            placeholder="Faulty items can be returned within 7 days with proof of purchase."
          />
          <span className={styles.hint}>Shown on product pages and at checkout.</span>
        </label>
      </section>

      <div>
        <Button disabled={save.isPending} onClick={() => void handleSave()}>
          {save.isPending ? (
            <>
              <Spinner size="sm" /> Saving
            </>
          ) : (
            "Save settings"
          )}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutSettingsPage;
