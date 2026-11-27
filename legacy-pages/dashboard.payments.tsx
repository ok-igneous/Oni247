import { useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, ExternalLink, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { Switch } from "../components/Switch";
import { Badge } from "../components/Badge";
import { Skeleton } from "../components/Skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/Dialog";
import { Field, Fields, PageHead, Panel } from "../components/Panel";
import { SectionLayout, useSection, type SectionItem } from "../components/SectionLayout";
import { formatMoney } from "../helpers/formatMoney";
import { useGateways, useGatewayAction } from "../helpers/useGateways";
import type { GatewayProvider } from "../helpers/paymentProviders";
import { getPaymentLinks, type PaymentLinkItem } from "../endpoints/payments/links_GET.schema";
import { postPaymentLink } from "../endpoints/payments/links_POST.schema";
import { getTransactions } from "../endpoints/payments/transactions_GET.schema";
import styles from "./dashboard.payments.module.css";

const PROVIDERS: Array<{ id: GatewayProvider; name: string; keyHint: string; where: string }> = [
  { id: "paystack", name: "Paystack", keyHint: "sk_live_… or sk_test_…", where: "Paystack dashboard → Settings → API Keys & Webhooks → Secret key." },
  { id: "flutterwave", name: "Flutterwave", keyHint: "FLWSECK-…", where: "Flutterwave dashboard → Settings → API keys → Secret key." },
  { id: "stripe", name: "Stripe", keyHint: "sk_live_… or rk_live_…", where: "Stripe dashboard → Developers → API keys → Secret key." },
];

const SECTIONS: SectionItem[] = [
  { id: "gateway", label: "Payment account", hint: "Connect Paystack, Flutterwave or Stripe" },
  { id: "links", label: "Payment links", hint: "Get paid with a shareable link" },
  { id: "transactions", label: "Transactions", hint: "Money received and pending" },
];

const copy = (text: string) => {
  void navigator.clipboard.writeText(text).then(() => toast.success("Copied.")).catch(() => toast.error("Could not copy."));
};

const Gateway = () => {
  const { data, isFetching, error } = useGateways();
  const act = useGatewayAction();
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (label: string, body: Parameters<typeof act.mutateAsync>[0], done: string) => {
    setBusy(label);
    try {
      await act.mutateAsync(body);
      toast.success(done);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (isFetching && !data) return <Skeleton className={styles.skeleton} />;
  if (error || !data) return <p className={styles.error}>{error instanceof Error ? error.message : "Could not load your payment settings."}</p>;
  const live = data.gateways.find((g) => g.enabled);
  return (
    <Panel title="Payment account" desc="Connect your own account so customers pay you online. The money goes straight to you. Oni247 never holds it.">
      {!data.serverReady && <p className={styles.warn}>Saving keys is not switched on for this app yet. Ask the Oni247 admin to finish the payment setup.</p>}
      <p className={styles.note}><ShieldCheck size={15} /> One account is live at a time. Your keys are encrypted and never shown again after saving.</p>
      <ol className={styles.steps}>
        <li className={data.gateways.some((g) => g.hasSecret) ? styles.stepDone : ""}>Paste your secret key and save it</li>
        <li className={data.gateways.some((g) => g.verified) ? styles.stepDone : ""}>Test the key</li>
        <li className={live ? styles.stepDone : ""}>Switch it on, then add the webhook link in your provider</li>
      </ol>
      <div className={styles.grid}>
        {PROVIDERS.map((p) => {
          const g = data.gateways.find((x) => x.provider === p.id);
          const typed = (keys[p.id] ?? "").trim();
          return (
            <section key={p.id} className={`${styles.card} ${g?.enabled ? styles.cardOn : ""}`}>
              <div className={styles.cardHead}>
                <h2>{p.name}</h2>
                {g?.enabled ? <Badge variant="success">Live</Badge> : g?.verified ? <Badge variant="warning">Ready, switched off</Badge> : g?.hasSecret ? <Badge variant="warning">Not tested</Badge> : <Badge variant="outline">Not connected</Badge>}
              </div>
              <p className={styles.help}>{p.where}</p>
              <label className={styles.field}>
                <span>{g?.hasSecret ? "Replace secret key" : "Secret key"}</span>
                <Input type="password" autoComplete="off" value={keys[p.id] ?? ""} onChange={(e) => setKeys({ ...keys, [p.id]: e.target.value })} placeholder={g?.hasSecret ? "Saved. Paste a new key to replace it." : p.keyHint} />
              </label>
              {g?.lastError && <p className={styles.error}>{g.lastError}</p>}
              <div className={styles.actions}>
                <Button size="sm" disabled={!data.serverReady || typed.length < 8 || busy !== null} onClick={async () => { if (await run(`${p.id}-save`, { op: "save", provider: p.id, secretKey: typed }, "Key saved.")) setKeys({ ...keys, [p.id]: "" }); }}>Save key</Button>
                <Button size="sm" variant="outline" disabled={!g?.hasSecret || busy !== null} onClick={() => void run(`${p.id}-test`, { op: "test", provider: p.id }, "Keys work.")}>Test keys</Button>
                {g?.enabled ? (
                  <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => void run(`${p.id}-off`, { op: "enable", provider: p.id, enabled: false }, "Online payments switched off.")}>Switch off</Button>
                ) : (
                  <Button size="sm" variant="secondary" disabled={!g?.verified || busy !== null} onClick={() => void run(`${p.id}-on`, { op: "enable", provider: p.id, enabled: true }, `${p.name} is now live on your site.`)}><CheckCircle2 size={14} /> Switch on</Button>
                )}
                {g?.hasSecret && <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void run(`${p.id}-rm`, { op: "remove", provider: p.id }, "Removed.")}>Remove</Button>}
              </div>
              {g?.hasSecret && (
                <div className={styles.hook}>
                  <span>Webhook link (paste it in {p.name}, so payments confirm even if the customer closes the page)</span>
                  <div className={styles.hookRow}>
                    <code>{g.webhookUrl}</code>
                    <Button size="icon-sm" variant="ghost" aria-label="Copy webhook link" onClick={() => copy(g.webhookUrl)}><Copy size={14} /></Button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
      <section className={styles.where}>
        <h2>Where customers can pay</h2>
        <ul>
          <li>Online store: “Pay online” at checkout.</li>
          <li>Service and booking sites: a deposit or the full amount when booking.</li>
          <li>Any site: a payment link you share by WhatsApp, email, social or print.</li>
        </ul>
      </section>
    </Panel>
  );
};

const LinkDialog = ({ link, onClose }: { link: PaymentLinkItem | null; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(link?.title ?? "");
  const [description, setDescription] = useState(link?.description ?? "");
  const [fixed, setFixed] = useState(link ? link.amount !== null : true);
  const [amount, setAmount] = useState(link?.amount ? String(link.amount) : "");
  const [active, setActive] = useState(link?.active ?? true);
  const save = useMutation({
    mutationFn: () => {
      const n = Number(amount.replace(/[^0-9.]/g, ""));
      if (fixed && !(n > 0)) throw new Error("Enter the amount to charge.");
      return postPaymentLink({ op: "save", id: link?.id, title, description, amount: fixed ? n : null, active });
    },
    onSuccess: () => {
      toast.success("Payment link saved.");
      void queryClient.invalidateQueries({ queryKey: ["payment-links"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save the link."),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{link ? "Edit payment link" : "New payment link"}</DialogTitle>
          <DialogDescription>Customers open the link, enter their details and pay through your connected account.</DialogDescription>
        </DialogHeader>
        <Fields>
          <Field label="What is it for?" full><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Website design deposit" /></Field>
          <Field label="Note to the payer (optional)" full><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        </Fields>
        <label className={styles.switchRow}><Switch checked={fixed} onCheckedChange={setFixed} /><span>Fixed amount (turn off to let the payer choose)</span></label>
        {fixed && <Field label="Amount"><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25000" /></Field>}
        <label className={styles.switchRow}><Switch checked={active} onCheckedChange={setActive} /><span>Accepting payments</span></label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending || !title.trim()} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save link"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Links = () => {
  const queryClient = useQueryClient();
  const { data, isFetching, error } = useQuery({ queryKey: ["payment-links"], queryFn: () => getPaymentLinks(), retry: false });
  const [editing, setEditing] = useState<{ link: PaymentLinkItem | null } | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => postPaymentLink({ op: "delete", id }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["payment-links"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete."),
  });
  if (isFetching && !data) return <Skeleton className={styles.skeleton} />;
  if (error || !data) return <p className={styles.error}>{error instanceof Error ? error.message : "Could not load payment links."}</p>;
  return (
    <Panel title="Payment links" desc="A link anyone can open to pay you, with no store needed. Share it on WhatsApp, Instagram, email or a printed invoice." actions={<Button size="sm" onClick={() => setEditing({ link: null })}><Plus size={14} /> New link</Button>}>
      {!data.gatewayLive && <p className={styles.warn}>Links cannot take payments until a payment account is switched on in Payment account.</p>}
      {data.links.length === 0 ? (
        <p className={styles.empty}>You have no payment links yet. Create one to start getting paid, for a deposit, an invoice or a donation.</p>
      ) : (
        <div className={styles.linkList}>
          {data.links.map((l) => (
            <div key={l.id} className={styles.linkRow}>
              <div className={styles.linkMain}>
                <div className={styles.linkTitle}>{l.title} {!l.active && <Badge variant="secondary">Off</Badge>}</div>
                <p className={styles.linkMeta}>{l.amount === null ? "Payer chooses the amount" : formatMoney(l.amount, data.currency)} · {l.paidCount} paid · {formatMoney(l.paidTotal, data.currency)} received</p>
                <div className={styles.hookRow}><code>{l.url}</code><Button size="icon-sm" variant="ghost" aria-label="Copy link" onClick={() => copy(l.url)}><Copy size={14} /></Button><Button size="icon-sm" variant="ghost" aria-label="Open link" onClick={() => window.open(l.url, "_blank", "noopener")}><ExternalLink size={14} /></Button></div>
              </div>
              <div className={styles.linkActions}>
                <Button size="sm" variant="outline" onClick={() => setEditing({ link: l })}><Pencil size={13} /> Edit</Button>
                <Button size="icon-sm" variant="ghost" aria-label={`Delete ${l.title}`} disabled={remove.isPending} onClick={() => { if (window.confirm(`Delete “${l.title}”? Past payments stay in Transactions.`)) remove.mutate(l.id); }}><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <LinkDialog key={editing.link?.id ?? "new"} link={editing.link} onClose={() => setEditing(null)} />}
    </Panel>
  );
};

const kindLabel = { order: "Order", booking: "Booking", link: "Payment link" } as const;

const Transactions = () => {
  const { data, isFetching, error } = useQuery({ queryKey: ["payment-transactions"], queryFn: () => getTransactions(), retry: false });
  if (isFetching && !data) return <Skeleton className={styles.skeleton} />;
  if (error || !data) return <p className={styles.error}>{error instanceof Error ? error.message : "Could not load transactions."}</p>;
  return (
    <Panel title="Transactions" desc="Online payments from orders, bookings and payment links.">
      <div className={styles.totals}>
        <div><span>Received this month</span><strong>{formatMoney(data.receivedThisMonth, data.currency)}</strong></div>
        <div><span>Received in total</span><strong>{formatMoney(data.receivedTotal, data.currency)}</strong></div>
        <div><span>Waiting for payment</span><strong>{formatMoney(data.pendingTotal, data.currency)}</strong></div>
      </div>
      {data.items.length === 0 ? (
        <p className={styles.empty}>No online payments yet. They appear here as soon as a customer starts to pay.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Date</th><th>For</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={`${t.kind}-${t.id}`}>
                  <td>{new Date(t.at).toLocaleDateString()}</td>
                  <td>{t.label}<small>{kindLabel[t.kind]}{t.provider ? ` · ${t.provider}` : ""}</small></td>
                  <td>{t.customer}</td>
                  <td className={styles.mono}>{formatMoney(t.amount, t.currency)}</td>
                  <td><Badge variant={t.status === "paid" ? "success" : t.status === "failed" ? "destructive" : "warning"}>{t.status === "paid" ? "Paid" : t.status === "failed" ? "Failed" : "Waiting"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};

const PaymentsPage = () => {
  const [section, setSection] = useSection(SECTIONS);
  return (
    <div className={styles.page}>
      <Helmet><title>Payments — Oni247</title></Helmet>
      <PageHead title="Payments" lead="Connect your payment account, share payment links and see the money coming in." />
      <SectionLayout title="Payments" items={SECTIONS} value={section} onChange={setSection}>
        {section === "gateway" ? <Gateway /> : section === "links" ? <Links /> : <Transactions />}
      </SectionLayout>
    </div>
  );
};

export default PaymentsPage;

