import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./Button";
import { Input } from "./Input";
import { Skeleton } from "./Skeleton";
import { Switch } from "./Switch";
import { Textarea } from "./Textarea";
import { useEmailWorkspace, useEmailWorkspaceAction } from "../helpers/useEmail";
import { AUTOMATIONS, STARTER_TEMPLATES, automationDef, type AutomationTrigger } from "../helpers/emailAutomations";
import type { ComposeInitial } from "./EmailCompose";
import type { EmailTemplate } from "../helpers/emailTemplate";
import styles from "./EmailWorkspace.module.css";

const fromTemplate = (t: { subject: string; message: string; look?: unknown }): ComposeInitial => ({
  subject: t.subject,
  message: t.message,
  chosen: {},
  manual: "",
  look: t.look && typeof t.look === "object" ? (t.look as Partial<EmailTemplate>) : null,
});

export function EmailTemplates({ onUse }: { onUse: (draft: ComposeInitial) => void }) {
  const { data, isFetching } = useEmailWorkspace();
  const act = useEmailWorkspaceAction();
  if (isFetching && !data) return <Skeleton style={{ height: 160 }} />;
  const mine = data?.templates ?? [];
  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <h2>My templates</h2>
        {mine.length === 0 ? (
          <p className={styles.hint}>No saved templates yet. In Compose, write an email and press Save as template.</p>
        ) : (
          <div className={styles.list}>
            {mine.map((t) => (
              <div className={styles.row} key={t.id}>
                <span className={styles.rowMain}><strong>{t.name}</strong><span className={styles.meta}>{t.subject || "(no subject)"}</span></span>
                <span className={styles.rowActions}>
                  <Button size="sm" onClick={() => onUse(fromTemplate(t))}>Use</Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (window.confirm(`Delete the template "${t.name}"?`)) act.mutate({ op: "template.delete", id: t.id }); }}>Delete</Button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className={styles.panel}>
        <h2>Starter templates</h2>
        <p className={styles.hint}>Ready-made emails to start from. Change anything before you send.</p>
        <div className={styles.list}>
          {STARTER_TEMPLATES.map((t) => (
            <div className={styles.row} key={t.id}>
              <span className={styles.rowMain}><strong>{t.name}</strong><span className={styles.meta}>{t.subject}</span></span>
              <span className={styles.rowActions}><Button size="sm" variant="outline" onClick={() => onUse(fromTemplate(t))}>Use</Button></span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AutomationCard({ trigger, enabled, subject, message }: { trigger: AutomationTrigger; enabled: boolean; subject: string; message: string }) {
  const def = automationDef(trigger);
  const act = useEmailWorkspaceAction();
  const [s, setS] = useState(subject);
  const [m, setM] = useState(message);
  const [on, setOn] = useState(enabled);
  const dirty = s !== subject || m !== message || on !== enabled;
  const save = (next = on) =>
    act.mutate({ op: "automation.save", trigger, enabled: next, subject: s, message: m }, {
      onSuccess: () => toast.success(next ? "Saved. This email is on." : "Saved. This email is off."),
      onError: (e) => { setOn(enabled); toast.error(e instanceof Error ? e.message : "Could not save."); },
    });
  return (
    <section className={styles.panel}>
      <label className={styles.switchRow}>
        <Switch checked={on} onCheckedChange={(v) => { setOn(v); save(v); }} disabled={act.isPending} />
        <strong>{def?.label}</strong>
      </label>
      <p className={styles.hint}>{def?.when}</p>
      <div className={styles.field}><label>Subject</label><Input value={s} maxLength={150} onChange={(e) => setS(e.target.value)} /></div>
      <div className={styles.field}>
        <label>Message</label>
        <Textarea rows={6} value={m} maxLength={5000} onChange={(e) => setM(e.target.value)} />
        <p className={styles.hint}>You can use {def?.tokens.join(", ")}. Your look and business details are added automatically.</p>
      </div>
      <div><Button size="sm" onClick={() => save()} disabled={act.isPending || !dirty}>Save changes</Button></div>
    </section>
  );
}

export function EmailAutomations() {
  const { data, isFetching } = useEmailWorkspace();
  if (isFetching && !data) return <Skeleton style={{ height: 200 }} />;
  return (
    <div className={styles.stack}>
      <div className={styles.notice}>Automatic emails send themselves when something happens, like a new order. Switch on the ones you want. They are sent only to people who gave an email address, and they use your sender and look from Settings.</div>
      {(data?.automations ?? AUTOMATIONS.map((a) => ({ trigger: a.trigger, enabled: false, subject: a.subject, message: a.message }))).map((a) => (
        <AutomationCard key={`${a.trigger}-${a.subject.length}-${a.message.length}-${a.enabled}`} {...a} />
      ))}
    </div>
  );
}

export function EmailContacts({ onEmail }: { onEmail: (draft: ComposeInitial) => void }) {
  const { data, isFetching } = useEmailWorkspace();
  const act = useEmailWorkspaceAction();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [bulk, setBulk] = useState("");
  const [q, setQ] = useState("");
  if (isFetching && !data) return <Skeleton style={{ height: 160 }} />;
  const contacts = (data?.contacts ?? []).filter((c) => {
    const t = q.trim().toLowerCase();
    return !t || c.email.includes(t) || c.name.toLowerCase().includes(t);
  });
  const add = () =>
    act.mutate({ op: "contact.save", email, name, phone: phone || undefined, note: note || undefined }, {
      onSuccess: () => { toast.success("Contact saved."); setName(""); setEmail(""); setPhone(""); setNote(""); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save the contact."),
    });
  const importBulk = () =>
    act.mutate({ op: "contact.import", text: bulk }, {
      onSuccess: (r) => { toast.success(`Added ${r.imported ?? 0} contacts.`); setBulk(""); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not import."),
    });
  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <h2>Add a contact</h2>
        <div className={styles.two}>
          <div className={styles.field}><label htmlFor="ct-name">Name</label><Input id="ct-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></div>
          <div className={styles.field}><label htmlFor="ct-email">Email</label><Input id="ct-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className={styles.field}><label htmlFor="ct-phone">Phone (optional)</label><Input id="ct-phone" value={phone} maxLength={40} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className={styles.field}><label htmlFor="ct-note">Note (optional)</label><Input id="ct-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <div><Button size="sm" onClick={add} disabled={act.isPending || !email.trim()}>Save contact</Button></div>
      </section>
      <section className={styles.panel}>
        <h2>Add many at once</h2>
        <div className={styles.field}>
          <Textarea rows={4} value={bulk} placeholder={"Ada Obi, ada@example.com\nchidi@example.com"} onChange={(e) => setBulk(e.target.value)} />
          <p className={styles.hint}>One person per line: a name and an email, or just an email. Up to 500 at a time. Only add people who agreed to hear from you.</p>
        </div>
        <div><Button size="sm" variant="outline" onClick={importBulk} disabled={act.isPending || !bulk.trim()}>Add these contacts</Button></div>
      </section>
      <section className={styles.panel}>
        <h2>Contacts ({data?.contacts.length ?? 0})</h2>
        <p className={styles.hint}>Your customers and event registrations are already available when you write an email, so you only need to add other people here.</p>
        {(data?.contacts.length ?? 0) > 5 && <Input value={q} placeholder="Search contacts" onChange={(e) => setQ(e.target.value)} />}
        {contacts.length === 0 ? (
          <p className={styles.hint}>No contacts yet.</p>
        ) : (
          <div className={styles.list}>
            {contacts.map((c) => (
              <div className={styles.row} key={c.id}>
                <span className={styles.rowMain}>
                  <strong>{c.name || c.email}</strong>
                  <span className={styles.meta}>{c.name ? `${c.email}` : ""}{c.phone ? ` · ${c.phone}` : ""}{c.unsubscribed ? " · Unsubscribed" : ""}{c.bounced ? " · Email bounced" : ""}</span>
                  {c.note && <span className={styles.meta}>{c.note}</span>}
                </span>
                <span className={styles.rowActions}>
                  <Button size="sm" variant="outline" disabled={c.unsubscribed || c.bounced} onClick={() => onEmail({ subject: "", message: "", chosen: { [c.email]: c.name }, manual: "", look: null })}>Email</Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Remove this contact?")) act.mutate({ op: "contact.delete", id: c.id }); }}>Remove</Button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
