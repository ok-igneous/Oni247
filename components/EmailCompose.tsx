import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";
import { EmailLookEditor } from "./EmailLookEditor";
import { Input } from "./Input";
import { Switch } from "./Switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";
import { Textarea } from "./Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";
import { useEmailOverview, useEmailSettings, useEmailWorkspace, useEmailWorkspaceAction, useSendEmail } from "../helpers/useEmail";
import { STARTER_TEMPLATES, fillTokens } from "../helpers/emailAutomations";
import { DEFAULT_EMAIL_TEMPLATE, fillEmail, parseEmailTemplate, renderEmail, type EmailTemplate } from "../helpers/emailTemplate";
import styles from "./EmailWorkspace.module.css";

export type ComposeInitial = {
  draftId?: string;
  subject: string;
  message: string;
  chosen: Record<string, string>;
  manual: string;
  look: Partial<EmailTemplate> | null;
};

export const EMPTY_COMPOSE: ComposeInitial = { subject: "", message: "", chosen: {}, manual: "", look: null };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const parseManual = (text: string) => Array.from(new Set(text.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter((s) => EMAIL_RE.test(s))));

type Row = { email: string; name: string; sub: string };

function PickList({ rows, chosen, onToggle, onAll, empty }: { rows: Row[]; chosen: Record<string, string>; onToggle: (r: Row) => void; onAll: (rows: Row[], on: boolean) => void; empty: string }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter((r) => r.email.includes(t) || r.name.toLowerCase().includes(t) || r.sub.toLowerCase().includes(t)) : rows;
  }, [rows, q]);
  if (rows.length === 0) return <p className={styles.hint}>{empty}</p>;
  const allOn = shown.length > 0 && shown.every((r) => chosen[r.email] !== undefined);
  return (
    <div className={styles.stack}>
      <div className={styles.actions}>
        <Input value={q} placeholder="Search" onChange={(e) => setQ(e.target.value)} />
        <Button size="sm" variant="outline" onClick={() => onAll(shown, !allOn)}>{allOn ? "Unselect shown" : `Select all shown (${shown.length})`}</Button>
      </div>
      <div className={styles.picker}>
        <div className={styles.list}>
          {shown.map((r) => (
            <label key={`${r.email}-${r.sub}`} className={styles.row}>
              <Checkbox checked={chosen[r.email] !== undefined} onChange={() => onToggle(r)} />
              <span className={styles.rowMain}>
                <strong>{r.name || r.email}</strong>
                <span className={styles.meta}>{r.name ? `${r.email} · ` : ""}{r.sub}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmailCompose({ initial, onChanged }: { initial: ComposeInitial; onChanged?: () => void }) {
  const overview = useEmailOverview();
  const settings = useEmailSettings();
  const workspace = useEmailWorkspace();
  const act = useEmailWorkspaceAction();
  const send = useSendEmail();

  const [draftId, setDraftId] = useState(initial.draftId);
  const [subject, setSubject] = useState(initial.subject);
  const [message, setMessage] = useState(initial.message);
  const [chosen, setChosen] = useState<Record<string, string>>(initial.chosen);
  const [manual, setManual] = useState(initial.manual);
  const [custom, setCustom] = useState(Boolean(initial.look));
  const [look, setLook] = useState<Partial<EmailTemplate>>(initial.look ?? {});
  const [showPreview, setShowPreview] = useState(false);

  const base = settings.data?.template ?? DEFAULT_EMAIL_TEMPLATE;
  const merged: EmailTemplate = parseEmailTemplate({ template: { ...base, ...(custom ? look : {}) } });
  const people = useMemo(() => {
    const map = new Map<string, string>(Object.entries(chosen));
    for (const e of parseManual(manual)) if (!map.has(e)) map.set(e, "");
    return Array.from(map, ([email, name]) => ({ email, name }));
  }, [chosen, manual]);

  const data = workspace.data;
  const customers: Row[] = (data?.people.customers ?? []).map((p) => ({ email: p.email, name: p.name, sub: "Customer" }));
  const participants: Row[] = (data?.people.participants ?? []).map((p) => ({ email: p.email, name: p.name, sub: `${p.event} · ${p.status}` }));
  const contacts: Row[] = (data?.contacts ?? []).filter((c) => !c.unsubscribed && !c.bounced).map((c) => ({ email: c.email, name: c.name, sub: "Contact" }));

  const toggle = (r: Row) => setChosen((s) => { const n = { ...s }; if (n[r.email] !== undefined) delete n[r.email]; else n[r.email] = r.name; return n; });
  const all = (rows: Row[], on: boolean) => setChosen((s) => { const n = { ...s }; for (const r of rows) { if (on) n[r.email] = r.name; else delete n[r.email]; } return n; });

  const previewHtml = useMemo(() => {
    const biz = settings.data?.business;
    if (!biz || !showPreview) return "";
    const r = renderEmail({ business: biz, template: merged, origin: window.location.origin, message: fillTokens(message || "Your message appears here.", { business: biz.name }).replace(/\[name\]/gi, "Ada") });
    return fillEmail(r.html, { greeting: "Ada", greetingHtml: "Ada", unsubscribeUrl: "#" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.data?.business, showPreview, message, JSON.stringify(merged)]);

  const applyTemplate = (value: string) => {
    if (value.startsWith("starter:")) {
      const t = STARTER_TEMPLATES.find((s) => s.id === value.slice(8));
      if (t) { setSubject(t.subject); setMessage(t.message); }
    } else {
      const t = data?.templates.find((x) => x.id === value);
      if (t) {
        setSubject(t.subject);
        setMessage(t.message);
        if (t.look && typeof t.look === "object") { setLook(t.look as Partial<EmailTemplate>); setCustom(true); }
      }
    }
  };

  const draftPayload = () => ({
    op: "draft.save" as const,
    id: draftId,
    subject,
    message,
    recipients: { people: Object.entries(chosen).map(([email, name]) => ({ email, name })), manual },
    look: custom ? look : null,
  });

  const saveDraft = () =>
    act.mutate(draftPayload(), {
      onSuccess: (r) => { if (r.id) setDraftId(r.id); toast.success("Draft saved."); onChanged?.(); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save the draft."),
    });

  const saveTemplate = () => {
    const name = window.prompt("Name this template");
    if (!name?.trim()) return;
    act.mutate({ op: "template.save", name, subject, message, look: custom ? look : null }, {
      onSuccess: () => toast.success("Template saved. Find it under Templates."),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save the template."),
    });
  };

  const submit = () => {
    if (people.length === 0) return toast.error("Choose who to send to first.");
    if (!window.confirm(`Send this email to ${people.length} ${people.length === 1 ? "person" : "people"}?`)) return;
    send.mutate(
      { audience: { kind: "list", people }, subject, message, look: custom ? look : undefined, draftId },
      {
        onSuccess: (r) => {
          toast.success(`Sent to ${r.sent} ${r.sent === 1 ? "person" : "people"}${r.failed ? `, ${r.failed} failed` : ""}.`);
          setSubject(""); setMessage(""); setChosen({}); setManual(""); setDraftId(undefined); setCustom(false); setLook({});
          onChanged?.();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send the email."),
      },
    );
  };

  const canSend = overview.data?.canSend ?? false;

  return (
    <div className={styles.stack}>
      {overview.data && !canSend && (
        <div className={styles.notice}>
          {overview.data.sendingReady ? "Email needs Premium Plus and the Email add-on switched on." : "Sending is paused until your sender is ready. Open Settings to connect your own provider and send a test email."} You can still write and save drafts.
        </div>
      )}

      <section className={styles.panel}>
        <h2>Compose</h2>
        <div className={styles.field}>
          <label>Start from a template</label>
          <Select onValueChange={applyTemplate}>
            <SelectTrigger><SelectValue placeholder="Choose a template (optional)" /></SelectTrigger>
            <SelectContent>
              {STARTER_TEMPLATES.map((t) => <SelectItem key={t.id} value={`starter:${t.id}`}>{t.name}</SelectItem>)}
              {(data?.templates ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name} (mine)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className={styles.field}>
          <label htmlFor="c-subject">Subject</label>
          <Input id="c-subject" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="c-message">Message</label>
          <Textarea id="c-message" rows={9} value={message} maxLength={5000} onChange={(e) => setMessage(e.target.value)} />
          <p className={styles.hint}>Type [name] for the person's first name and [business] for your business name. Your details and an unsubscribe link are added around the message.</p>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>Who gets it</h2>
        <div className={styles.chips}>
          <strong>{people.length}</strong> {people.length === 1 ? "person" : "people"} chosen
          {people.length > 0 && <Button size="sm" variant="ghost" onClick={() => { setChosen({}); setManual(""); }}>Clear</Button>}
        </div>
        {people.length > 0 && (
          <div className={styles.chips}>
            {people.slice(0, 12).map((p) => (
              <span key={p.email} className={styles.chip}>
                {p.name || p.email}
                <button type="button" className={styles.chipX} aria-label={`Remove ${p.email}`} onClick={() => { setChosen((s) => { const n = { ...s }; delete n[p.email]; return n; }); setManual((m) => m.split(/[\s,;]+/).filter((x) => x.trim().toLowerCase() !== p.email).join("\n")); }}>×</button>
              </span>
            ))}
            {people.length > 12 && <span className={styles.meta}>and {people.length - 12} more</span>}
          </div>
        )}
        <Tabs defaultValue="customers">
          <div className={styles.scroll}>
            <TabsList>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="manual">Type emails</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="customers"><PickList rows={customers} chosen={chosen} onToggle={toggle} onAll={all} empty="No customers with an email address yet." /></TabsContent>
          <TabsContent value="participants"><PickList rows={participants} chosen={chosen} onToggle={toggle} onAll={all} empty="No event registrations with an email address yet." /></TabsContent>
          <TabsContent value="contacts"><PickList rows={contacts} chosen={chosen} onToggle={toggle} onAll={all} empty="No contacts yet. Add some under Contacts." /></TabsContent>
          <TabsContent value="manual">
            <div className={styles.field}>
              <Textarea rows={5} value={manual} placeholder={"ada@example.com\nchidi@example.com"} onChange={(e) => setManual(e.target.value)} />
              <p className={styles.hint}>Separate emails with a space, comma or new line. Only send to people who agreed to hear from you.</p>
            </div>
          </TabsContent>
        </Tabs>
        <p className={styles.hint}>People who unsubscribed are left out automatically. You can send to up to 200 people at a time.</p>
      </section>

      <section className={styles.panel}>
        <h2>Look of this email</h2>
        <label className={styles.switchRow}>
          <Switch checked={custom} onCheckedChange={(v) => { setCustom(v); if (v && Object.keys(look).length === 0) setLook({ ...base }); }} />
          Use a custom look for this email only
        </label>
        <p className={styles.hint}>{custom ? "Changes here apply to this email only. Your default look stays the same." : "This email uses your default look from Settings."}</p>
        {custom && <EmailLookEditor idPrefix="c" value={merged} onChange={(patch) => setLook((s) => ({ ...s, ...patch }))} />}
        <div className={styles.actions}>
          <Button size="sm" variant="outline" onClick={() => setShowPreview((v) => !v)}>{showPreview ? "Hide preview" : "Show preview"}</Button>
        </div>
        {showPreview && <iframe className={styles.preview} title="Email preview" sandbox="" srcDoc={previewHtml} />}
      </section>

      <div className={styles.actions}>
        <Button onClick={submit} disabled={!canSend || send.isPending || !subject.trim() || !message.trim() || people.length === 0}>
          {send.isPending ? "Sending…" : `Send to ${people.length} ${people.length === 1 ? "person" : "people"}`}
        </Button>
        <Button variant="outline" onClick={saveDraft} disabled={act.isPending || (!subject.trim() && !message.trim())}>Save draft</Button>
        <Button variant="ghost" onClick={saveTemplate} disabled={act.isPending || (!subject.trim() && !message.trim())}>Save as template</Button>
      </div>
    </div>
  );
}
