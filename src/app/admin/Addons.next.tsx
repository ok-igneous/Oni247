import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Checkbox } from "../../../components/Checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/Dialog";
import { Input } from "../../../components/Input";
import { Textarea } from "../../../components/Textarea";
import { Switch } from "../../../components/Switch";
import { Skeleton } from "../../../components/Skeleton";
import { Field, Fields, PageHead, Panel } from "../../../components/Panel";
import { SectionLayout, useSection, type SectionItem } from "../../../components/SectionLayout";
import { formatMoney } from "../../../helpers/formatMoney";
import { ACTIONS, BUILT_IN_ROLES, MODULES, SYSTEM_ROLES } from "../../../helpers/permissions";
import { useAdminSettings, useAdminSettingsAction } from "../../../helpers/useAdminSettings";
import type { AdminAddon, OutputType } from "../../../endpoints/admin/settings_GET.schema";
import styles from "../../../pages/admin.addons.module.css";

const SECTIONS: SectionItem[] = [
  { id: "catalog", label: "Add-on catalog", hint: "Plans, price and visibility" },
  { id: "roles", label: "Roles and permissions", hint: "Every role and permission" },
];

type PlanLite = { id: string; name: string };

const availability = (a: AdminAddon, plans: PlanLite[]) => {
  if (a.freeForAll) return "Free for every plan";
  const included = (a.includedPlanIds ?? []).map((id) => plans.find((p) => p.id === id)?.name ?? id);
  const parts: string[] = [];
  if (included.length) parts.push(`Included in ${included.join(", ")}`);
  if ((a.priceMonthlyNgn ?? 0) > 0) parts.push(`${formatMoney(a.priceMonthlyNgn ?? 0, "NGN")} / month on other plans`);
  return parts.length ? parts.join(" · ") : "Not available to any plan yet";
};

const AddonDialog = ({ addon, plans, onClose }: { addon: AdminAddon; plans: PlanLite[]; onClose: () => void }) => {
  const act = useAdminSettingsAction();
  const [name, setName] = useState(addon.name);
  const [description, setDescription] = useState(addon.description);
  const [freeForAll, setFreeForAll] = useState(Boolean(addon.freeForAll));
  const [included, setIncluded] = useState<string[]>(addon.includedPlanIds ?? []);
  const [price, setPrice] = useState(String(addon.priceMonthlyNgn ?? 0));
  const [comingSoon, setComingSoon] = useState(addon.comingSoon);
  const [hidden, setHidden] = useState(addon.hidden);
  const toggle = (id: string, on: boolean) => setIncluded(on ? [...new Set([...included, id])] : included.filter((x) => x !== id));
  const save = async () => {
    try {
      const res = await act.mutateAsync({ op: "addon.config", id: addon.id, name, description, freeForAll, includedPlanIds: included, priceMonthlyNgn: Math.max(0, Number(price) || 0), comingSoon, hidden });
      toast.success(res.message ?? "Saved.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the add-on.");
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={styles.dialog}>
        <DialogHeader>
          <DialogTitle>Edit {addon.name}</DialogTitle>
          <DialogDescription>Choose who gets this add-on and what everyone else pays.</DialogDescription>
        </DialogHeader>
        <div className={styles.dialogBody}>
          <Fields>
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Description shown to shop owners" full><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          </Fields>

          <div className={styles.block}>
            <label className={styles.switchRow}>
              <Switch checked={freeForAll} onCheckedChange={setFreeForAll} />
              <span><strong>Free for everyone</strong><small>Every shop on every plan can switch it on.</small></span>
            </label>
          </div>

          {!freeForAll && (
            <>
              <div className={styles.block}>
                <p className={styles.blockTitle}>Included in these plans</p>
                <div className={styles.planChecks}>
                  {plans.map((p) => (
                    <label key={p.id} className={styles.check}>
                      <Checkbox checked={included.includes(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Fields>
                <Field label="Price on other plans (₦ per month)" hint="Shops whose plan does not include it can buy it. Use 0 to not sell it separately.">
                  <Input type="number" inputMode="decimal" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
                </Field>
              </Fields>
            </>
          )}

          <div className={styles.block}>
            <label className={styles.switchRow}><Switch checked={comingSoon} onCheckedChange={setComingSoon} /><span><strong>Show as “coming soon”</strong><small>Owners see it but cannot switch it on.</small></span></label>
            <label className={styles.switchRow}><Switch checked={hidden} onCheckedChange={setHidden} /><span><strong>Hide from shop owners</strong><small>Shops that already use it keep their data.</small></span></label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={act.isPending} onClick={() => void save()}>{act.isPending ? "Saving…" : "Save add-on"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Catalog = ({ data }: { data: OutputType }) => {
  const [editing, setEditing] = useState<AdminAddon | null>(null);
  const plans: PlanLite[] = (data.catalog ?? []).map((p) => ({ id: p.id, name: p.name }));
  return (
    <Panel title="Add-on catalog" desc="Each add-on can be free, included in chosen plans, or sold on its own at a monthly price.">
      <div className={styles.list}>
        {data.addons.map((a) => (
          <div key={a.id} className={styles.row}>
            <div className={styles.rowMain}>
              <div className={styles.rowName}>
                {a.name}
                {a.freeForAll ? <Badge variant="success">Free</Badge> : (a.priceMonthlyNgn ?? 0) > 0 ? <Badge variant="warning">{formatMoney(a.priceMonthlyNgn ?? 0, "NGN")} / mo</Badge> : <Badge variant="outline">Plans only</Badge>}
                {a.comingSoon && <Badge variant="secondary">Coming soon</Badge>}
                {a.hidden && <Badge variant="secondary">Hidden</Badge>}
              </div>
              <p className={styles.rowDesc}>{a.description}</p>
              <p className={styles.rowMeta}>{availability(a, plans)}{(a.shops ?? 0) > 0 ? ` · ${a.shops} shop${a.shops === 1 ? "" : "s"} paying` : ""}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(a)}><Pencil size={13} /> Edit</Button>
          </div>
        ))}
      </div>
      {editing && <AddonDialog key={editing.id} addon={editing} plans={plans} onClose={() => setEditing(null)} />}
    </Panel>
  );
};

const letters: Record<string, string> = { view: "V", create: "C", edit: "E", delete: "D" };

const Roles = () => (
  <>
    <Panel title="Built-in roles" desc="These exist for the whole platform and are not edited here.">
      <div className={styles.roleGrid}>
        {BUILT_IN_ROLES.map((r) => (
          <div key={r.id} className={styles.roleCard}>
            <div className={styles.rowName}>{r.name} <Badge variant="outline">{r.scope}</Badge></div>
            <p className={styles.rowDesc}>{r.description}</p>
            <ul className={styles.roleCan}>{r.can.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        ))}
      </div>
    </Panel>
    <Panel title="Starting roles for a shop's team" desc="Shop owners with the Team add-on start from these and can build their own. V view, C create, E edit, D delete.">
      <div className={styles.matrixWrap}>
        <table className={styles.matrix}>
          <thead>
            <tr><th>Module</th>{SYSTEM_ROLES.map((r) => <th key={r.name}>{r.name}</th>)}</tr>
          </thead>
          <tbody>
            {MODULES.map((m) => (
              <tr key={m.id}>
                <td>{m.label}<small>{m.group}</small></td>
                {SYSTEM_ROLES.map((r) => (
                  <td key={r.name} className={styles.mono}>{ACTIONS.filter((a) => r.permissions.includes(`${m.id}.${a.id}`)).map((a) => letters[a.id]).join(" ") || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>Plan, add-ons, billing and the team itself are always reserved for the shop owner.</p>
    </Panel>
  </>
);

const AdminAddonsPage = () => {
  const { data, isFetching, error } = useAdminSettings();
  const [section, setSection] = useSection(SECTIONS);
  return (
    <div className={styles.page}>
      
      <PageHead title="Add-ons" lead="Decide which add-ons exist, which plans get them, and what they cost." />
      {isFetching && !data ? (
        <Skeleton className={styles.skeleton} />
      ) : error || !data ? (
        <p className={styles.error}>{error instanceof Error ? error.message : "Could not load add-ons."}</p>
      ) : (
        <SectionLayout title="Add-ons" items={SECTIONS} value={section} onChange={setSection}>
          {section === "catalog" ? <Catalog data={data} /> : <Roles />}
        </SectionLayout>
      )}
    </div>
  );
};

export default AdminAddonsPage;

