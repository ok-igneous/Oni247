"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Checkbox } from "../../../components/Checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/Dialog";
import { Input } from "../../../components/Input";
import { Textarea } from "../../../components/Textarea";
import { Switch } from "../../../components/Switch";
import { Skeleton } from "../../../components/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/Select";
import { Field, Fields, PageHead, Panel } from "../../../components/Panel";
import { SectionLayout, useSection, type SectionItem } from "../../../components/SectionLayout";
import { FEATURES } from "../../../helpers/features";
import { formatMoney } from "../../../helpers/formatMoney";
import { useAdminSettings, useAdminSettingsAction } from "../../../helpers/useAdminSettings";
import type { PlanDef } from "../../../helpers/subscriptionPlan";
import type { OutputType } from "../../../endpoints/admin/settings_GET.schema";
import styles from "../../../pages/admin.plans.module.css";

const SECTIONS: SectionItem[] = [
  { id: "plans", label: "Plans", hint: "Create, price and order plans" },
  { id: "features", label: "Features per plan", hint: "Tick what each plan includes" },
  { id: "rules", label: "Trial and promo", hint: "Free trial, discount, longest term" },
];

const GROUPS = Array.from(new Set(FEATURES.map((f) => f.group)));
const slugId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 28) || "plan";
const limitText = (n: number | null) => (n === null ? "Unlimited" : String(n));
const parseLimit = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Math.floor(Number(t));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

type Rules = NonNullable<OutputType["planSettings"]>;

const PlanDialog = ({ plan, isNew, onCancel, onSave }: { plan: PlanDef; isNew: boolean; onCancel: () => void; onSave: (p: PlanDef) => void }) => {
  const [v, setV] = useState<PlanDef>({ ...plan, features: [...plan.features] });
  const [productLimit, setProductLimit] = useState(limitText(plan.productLimit) === "Unlimited" ? "" : String(plan.productLimit));
  const [daily, setDaily] = useState(plan.dailyCreationLimit === null ? "" : String(plan.dailyCreationLimit));
  const isFree = v.id === "free";
  const toggle = (id: string, on: boolean) => setV({ ...v, features: on ? [...new Set([...v.features, id as PlanDef["features"][number]])] : v.features.filter((f) => f !== id) });
  const submit = () => {
    if (!v.name.trim()) return toast.error("Give the plan a name.");
    onSave({ ...v, name: v.name.trim(), productLimit: parseLimit(productLimit), dailyCreationLimit: parseLimit(daily) });
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className={styles.dialog}>
        <DialogHeader>
          <DialogTitle>{isNew ? "New plan" : `Edit ${plan.name}`}</DialogTitle>
          <DialogDescription>Shop owners see the name, description, price and the features you tick.</DialogDescription>
        </DialogHeader>
        <div className={styles.dialogBody}>
          <Fields>
            <Field label="Plan name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Business Pro" /></Field>
            {!isFree && (
              <Field label="Price per month (₦)">
                <Input type="number" inputMode="decimal" min={0} value={Number.isFinite(v.priceMonthlyNgn) ? v.priceMonthlyNgn : 0} onChange={(e) => setV({ ...v, priceMonthlyNgn: Math.max(0, Number(e.target.value)) })} />
              </Field>
            )}
            <Field label="Description" full><Textarea rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
            <Field label="Product limit" hint="Leave empty for unlimited."><Input inputMode="numeric" value={productLimit} onChange={(e) => setProductLimit(e.target.value)} placeholder="Unlimited" /></Field>
            <Field label="New products per day" hint="Leave empty for unlimited."><Input inputMode="numeric" value={daily} onChange={(e) => setDaily(e.target.value)} placeholder="Unlimited" /></Field>
          </Fields>
          {!isFree && (
            <div className={styles.switches}>
              <label className={styles.switchRow}><Switch checked={v.active} onCheckedChange={(c) => setV({ ...v, active: c })} /><span>Available to buy</span></label>
              <label className={styles.switchRow}><Switch checked={v.highlighted} onCheckedChange={(c) => setV({ ...v, highlighted: c })} /><span>Highlight as the recommended plan</span></label>
            </div>
          )}
          {GROUPS.map((g) => (
            <fieldset key={g} className={styles.group}>
              <legend>{g}</legend>
              {FEATURES.filter((f) => f.group === g).map((f) => (
                <label key={f.id} className={styles.featureRow}>
                  <Checkbox checked={v.features.includes(f.id)} onChange={(e) => toggle(f.id, e.target.checked)} />
                  <span>{f.label}</span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={submit}>{isNew ? "Add plan" : "Done"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Editor = ({ initial, rules0 }: { initial: PlanDef[]; rules0: Rules }) => {
  const act = useAdminSettingsAction();
  const [section, setSection] = useSection(SECTIONS);
  const [plans, setPlans] = useState<PlanDef[]>(initial.map((p) => ({ ...p, features: [...p.features] })));
  const [rules, setRules] = useState<Rules>(rules0);
  const [editing, setEditing] = useState<{ plan: PlanDef; isNew: boolean } | null>(null);
  const [dirty, setDirty] = useState(false);

  const change = (next: PlanDef[]) => {
    setPlans(next);
    setDirty(true);
  };
  const paid = plans.filter((p) => p.id !== "free");

  const move = (id: string, dir: -1 | 1) => {
    const i = plans.findIndex((p) => p.id === id);
    const j = i + dir;
    if (i < 1 || j < 1 || j >= plans.length) return;
    const next = [...plans];
    [next[i], next[j]] = [next[j], next[i]];
    change(next);
  };
  const remove = (p: PlanDef) => {
    if (p.builtIn) return;
    if (!window.confirm(`Remove ${p.name}? Shops already paying on it fall back to One-Page until you move them.`)) return;
    change(plans.filter((x) => x.id !== p.id));
  };
  const startNew = () =>
    setEditing({
      isNew: true,
      plan: { id: "", name: "", description: "", priceMonthlyNgn: 5000, features: ["reports", "collections", "product_links", "tracking_links", "presence_edit"], productLimit: null, dailyCreationLimit: null, highlighted: false, active: true, builtIn: false, sort: plans.length },
    });
  const saveEdited = (p: PlanDef) => {
    if (editing?.isNew) {
      let id = slugId(p.name);
      let n = 2;
      while (plans.some((x) => x.id === id)) id = `${slugId(p.name)}_${n++}`;
      change([...plans, { ...p, id }]);
    } else {
      change(plans.map((x) => (x.id === p.id ? p : x)));
    }
    setEditing(null);
  };
  const toggleFeature = (planId: string, feature: PlanDef["features"][number], on: boolean) =>
    change(plans.map((p) => (p.id === planId ? { ...p, features: on ? [...new Set([...p.features, feature])] : p.features.filter((f) => f !== feature) } : p)));

  const save = async () => {
    try {
      const res = await act.mutateAsync({
        op: "catalog.save",
        plans: plans.map((p, i) => ({ id: p.id, name: p.name, description: p.description, priceMonthlyNgn: p.priceMonthlyNgn, features: p.features, productLimit: p.productLimit, dailyCreationLimit: p.dailyCreationLimit, highlighted: p.highlighted, active: p.active, sort: i })),
        trialPlanId: rules.trialPlanId,
        trialDays: rules.trialDays,
        registrationPromoPercent: rules.registrationPromoPercent,
        maxDurationMonths: rules.maxDurationMonths,
      });
      setDirty(false);
      toast.success(res.message ?? "Saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the plans.");
    }
  };

  const num = (key: "trialDays" | "registrationPromoPercent" | "maxDurationMonths") => (e: React.ChangeEvent<HTMLInputElement>) => {
    setRules({ ...rules, [key]: Number(e.target.value) });
    setDirty(true);
  };

  return (
    <>
      <SectionLayout title="Plans" items={SECTIONS.map((s) => (s.id === "plans" ? { ...s, badge: plans.length } : s))} value={section} onChange={setSection}>
        {section === "plans" && (
          <Panel title="Plans" desc="The order here is the order shop owners see. Free is always first." actions={<Button size="sm" onClick={startNew}><Plus size={14} /> New plan</Button>}>
            <div className={styles.planList}>
              {plans.map((p, i) => (
                <div key={p.id} className={`${styles.planRow} ${!p.active ? styles.planOff : ""}`}>
                  <div className={styles.planMain}>
                    <div className={styles.planName}>
                      {p.name}
                      {p.highlighted && <Badge variant="warning"><Star size={11} /> Recommended</Badge>}
                      {!p.active && p.id !== "free" && <Badge variant="secondary">Hidden</Badge>}
                      {p.builtIn && <Badge variant="outline">Built in</Badge>}
                    </div>
                    <p className={styles.planDesc}>{p.description || "No description."}</p>
                    <p className={styles.planMeta}>
                      <span className={styles.price}>{p.id === "free" ? "Free" : `${formatMoney(p.priceMonthlyNgn, "NGN")} / month`}</span>
                      <span>{p.features.length} features</span>
                      <span>Products: {limitText(p.productLimit)}</span>
                    </p>
                  </div>
                  <div className={styles.planActions}>
                    <Button size="icon-sm" variant="ghost" aria-label="Move up" disabled={i < 2} onClick={() => move(p.id, -1)}><ArrowUp size={14} /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Move down" disabled={p.id === "free" || i === plans.length - 1} onClick={() => move(p.id, 1)}><ArrowDown size={14} /></Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing({ plan: p, isNew: false })}><Pencil size={13} /> Edit</Button>
                    {!p.builtIn && <Button size="icon-sm" variant="ghost" aria-label={`Remove ${p.name}`} onClick={() => remove(p)}><Trash2 size={14} /></Button>}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {section === "features" && (
          <Panel title="Features per plan" desc="Tick a box to include a feature in a plan. Add-ons that depend on a feature follow it automatically.">
            <div className={styles.matrixWrap}>
              <table className={styles.matrix}>
                <thead>
                  <tr>
                    <th>Feature</th>
                    {plans.map((p) => <th key={p.id}>{p.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {GROUPS.map((g) => (
                    <>
                      <tr key={`g-${g}`} className={styles.groupRow}><td colSpan={plans.length + 1}>{g}</td></tr>
                      {FEATURES.filter((f) => f.group === g).map((f) => (
                        <tr key={f.id}>
                          <td>{f.label}</td>
                          {plans.map((p) => (
                            <td key={p.id} className={styles.cell}>
                              <Checkbox checked={p.features.includes(f.id)} onChange={(e) => toggleFeature(p.id, f.id, e.target.checked)} aria-label={`${f.label} in ${p.name}`} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {section === "rules" && (
          <Panel title="Trial and promo" desc="Rules that apply across every plan.">
            <Fields>
              <Field label="Plan used for the free trial" hint="New shops try this plan once.">
                <Select value={rules.trialPlanId} onValueChange={(value) => { setRules({ ...rules, trialPlanId: value }); setDirty(true); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{paid.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Trial length (days)"><Input type="number" min={0} value={rules.trialDays} onChange={num("trialDays")} /></Field>
              <Field label="Registration promo (% off)" hint="Applied once to a new shop's first plan payment."><Input type="number" min={0} max={100} value={rules.registrationPromoPercent} onChange={num("registrationPromoPercent")} /></Field>
              <Field label="Longest term (months)" hint="The most months a shop can pay for at once."><Input type="number" min={1} max={60} value={rules.maxDurationMonths} onChange={num("maxDurationMonths")} /></Field>
            </Fields>
          </Panel>
        )}
      </SectionLayout>

      <div className={`${styles.saveBar} ${dirty ? styles.saveBarOn : ""}`} role="status">
        <span>{dirty ? "You have unsaved changes." : <><Check size={14} /> All changes saved.</>}</span>
        <Button disabled={!dirty || act.isPending} onClick={() => void save()}>{act.isPending ? "Saving…" : "Save changes"}</Button>
      </div>

      {editing && <PlanDialog plan={editing.plan} isNew={editing.isNew} onCancel={() => setEditing(null)} onSave={saveEdited} />}
    </>
  );
};

const AdminPlansPage = () => {
  const { data, isFetching, error } = useAdminSettings();
  return (
    <div className={styles.page}>
      
      <PageHead title="Plans" lead="Build the plans shop owners can buy: price, limits and exactly which features each one includes." />
      {isFetching && !data ? (
        <Skeleton className={styles.skeleton} />
      ) : error || !data || !data.catalog || !data.planSettings ? (
        <p className={styles.error}>{error instanceof Error ? error.message : "Could not load plans."}</p>
      ) : (
        <Editor initial={data.catalog} rules0={data.planSettings} />
      )}
    </div>
  );
};

export default AdminPlansPage;

