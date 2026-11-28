"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "../../../../components/Button";
import { EmailCompose, EMPTY_COMPOSE, type ComposeInitial } from "../../../../components/EmailCompose";
import { EmailLookEditor } from "../../../../components/EmailLookEditor";
import { EmailInbox, EmailDrafts } from "../../../../components/EmailMailbox";
import { EmailAutomations, EmailContacts, EmailTemplates } from "../../../../components/EmailLibrary";
import { Input } from "../../../../components/Input";
import { Skeleton } from "../../../../components/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/Tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/Select";
import { useEmailOverview, useEmailSettings, useEmailWorkspace, useSaveEmailSettings, useTestEmail } from "../../../../helpers/useEmail";
import { PROVIDERS, type MailProvider } from "../../../../helpers/mailProviders";
import { DEFAULT_EMAIL_TEMPLATE, fillEmail, renderEmail, type EmailTemplate } from "../../../../helpers/emailTemplate";
import type { OutputType as SettingsData } from "../../../../endpoints/email/settings_GET.schema";
import styles from "./dashboard.email.module.css";

type Edit = {
  mode?: "platform" | "own";
  provider?: Exclude<MailProvider, "platform">;
  apiKey?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  mailgunDomain?: string;
  mailgunRegion?: "us" | "eu";
  template?: Partial<EmailTemplate>;
};

function SettingsForm({ data }: { data: SettingsData }) {
  const save = useSaveEmailSettings();
  const test = useTestEmail();
  const [edit, setEdit] = useState<Edit>({});

  const mode = edit.mode ?? (data.provider && data.provider !== "platform" ? "own" : "platform");
  const ownProvider = edit.provider ?? (data.provider && data.provider !== "platform" ? data.provider : "resend");
  const fromName = edit.fromName ?? data.fromName;
  const fromEmail = edit.fromEmail ?? data.fromEmail;
  const replyTo = edit.replyTo ?? data.replyTo;
  const mailgunDomain = edit.mailgunDomain ?? data.mailgunDomain;
  const mailgunRegion = edit.mailgunRegion ?? data.mailgunRegion;
  const template: EmailTemplate = { ...DEFAULT_EMAIL_TEMPLATE, ...(data.template ?? {}), ...(edit.template ?? {}) };
  const dirty = Object.keys(edit).length > 0;
  const help = PROVIDERS.find((p) => p.id === ownProvider)?.help;
  const biz = data.business;

  const previewHtml = useMemo(() => {
    if (!biz) return "";
    const r = renderEmail({ business: biz, template, origin: window.location.origin, message: "Hello! This is how your emails will look to customers.\n\nWrite your news, offers or event updates here. Your business details sit at the bottom." });
    return fillEmail(r.html, { greeting: "Ada", greetingHtml: "Ada", unsubscribeUrl: "#" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biz, JSON.stringify(template)]);

  const submit = () =>
    save.mutate(
      { provider: mode === "platform" ? "platform" : ownProvider, apiKey: edit.apiKey || undefined, fromName, fromEmail: mode === "own" ? fromEmail : undefined, replyTo, mailgunDomain, mailgunRegion, template },
      {
        onSuccess: () => { setEdit({}); toast.success(mode === "own" ? "Saved. Send yourself a test email to confirm it works." : "Email settings saved."); },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save your settings."),
      },
    );

  const sendTest = () =>
    test.mutate(undefined, {
      onSuccess: (r) => toast.success(`Test email sent to ${r.sentTo}. Check your inbox.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "The test email failed."),
    });

  return (
    <>
      {!data.isPremiumPlus && <div className={styles.notice}>Email is included in Premium Plus. <Link href="/dashboard/plan">See plans</Link></div>}
      <Tabs defaultValue="sender">
        <TabsList>
          <TabsTrigger value="sender">Sender</TabsTrigger>
          <TabsTrigger value="look">Default look</TabsTrigger>
        </TabsList>

        <TabsContent value="sender">
          <section className={styles.panel}>
            <h2>How your emails are sent</h2>
            <div className={styles.modes} role="radiogroup" aria-label="Email sender">
              <button type="button" role="radio" aria-checked={mode === "platform"} className={`${styles.mode} ${mode === "platform" ? styles.modeOn : ""}`} onClick={() => setEdit((s) => ({ ...s, mode: "platform" }))}>
                <strong>Oni247 email (default)</strong>
                <small>Nothing to set up. Emails go out under your business name, replies come to you, and your details are added to every email.</small>
              </button>
              <button type="button" role="radio" aria-checked={mode === "own"} className={`${styles.mode} ${mode === "own" ? styles.modeOn : ""}`} onClick={() => setEdit((s) => ({ ...s, mode: "own" }))}>
                <strong>My own email provider</strong>
                <small>Send from your own Resend, Brevo, SendGrid or Mailgun account and your own address.</small>
              </button>
            </div>
            {mode === "platform" && !data.platformReady && <div className={styles.notice}>The Oni247 sender is not switched on yet, so sending is paused. Set up your look now, or connect your own provider to send today.</div>}
            <div className={styles.two}>
              <div className={styles.field}>
                <label htmlFor="mail-from-name">Sender name</label>
                <Input id="mail-from-name" value={fromName} maxLength={80} onChange={(e) => setEdit((s) => ({ ...s, fromName: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label htmlFor="mail-reply">Replies go to</label>
                <Input id="mail-reply" type="email" value={replyTo} placeholder={biz?.email ?? "you@yourshop.com"} onChange={(e) => setEdit((s) => ({ ...s, replyTo: e.target.value }))} />
                <p className={styles.hint}>Leave empty to use your business email.</p>
              </div>
            </div>
            {mode === "own" && (
              <>
                <div className={styles.field}>
                  <label>Email provider</label>
                  <Select value={ownProvider} onValueChange={(v) => setEdit((s) => ({ ...s, provider: v as Exclude<MailProvider, "platform"> }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {help && <p className={styles.hint}>{help}</p>}
                </div>
                <div className={styles.field}>
                  <label htmlFor="mail-key">API key</label>
                  <Input id="mail-key" type="password" autoComplete="off" value={edit.apiKey ?? ""} placeholder={data.hasKey ? "Saved. Leave blank to keep it." : "Paste your API key"} onChange={(e) => setEdit((s) => ({ ...s, apiKey: e.target.value }))} />
                  <p className={styles.hint}>Stored encrypted and never shown again.</p>
                </div>
                {ownProvider === "mailgun" && (
                  <div className={styles.two}>
                    <div className={styles.field}>
                      <label htmlFor="mail-domain">Mailgun domain</label>
                      <Input id="mail-domain" value={mailgunDomain} placeholder="mg.yourshop.com" onChange={(e) => setEdit((s) => ({ ...s, mailgunDomain: e.target.value }))} />
                    </div>
                    <div className={styles.field}>
                      <label>Mailgun region</label>
                      <Select value={mailgunRegion} onValueChange={(v) => setEdit((s) => ({ ...s, mailgunRegion: v as "us" | "eu" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="us">US</SelectItem><SelectItem value="eu">EU</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className={styles.field}>
                  <label htmlFor="mail-from-email">Sender email</label>
                  <Input id="mail-from-email" type="email" value={fromEmail} placeholder="hello@yourshop.com" onChange={(e) => setEdit((s) => ({ ...s, fromEmail: e.target.value }))} />
                  <p className={styles.hint}>An address you have verified with your provider.</p>
                </div>
                {!data.serverReady && <div className={styles.notice}>Saving your own provider is not switched on for this site yet.</div>}
              </>
            )}
          </section>
        </TabsContent>

        <TabsContent value="look">
          <section className={styles.panel}>
            <h2>Default look and business info</h2>
            <p className={styles.hint}>Every email uses this look unless you choose a custom look when writing it.</p>
            {biz && (
              <div className={styles.biz}>
                <strong>{biz.name}</strong>
                <span>{[biz.address, biz.phone, biz.email].filter(Boolean).join(" · ") || "No address, phone or email added yet."}</span>
                <span className={styles.meta}>This comes from your business page. <Link href="/dashboard/business">Edit business details</Link></span>
              </div>
            )}
            <EmailLookEditor idPrefix="s" value={template} onChange={(patch) => setEdit((s) => ({ ...s, template: { ...(s.template ?? {}), ...patch } }))} />
            <div className={styles.field}>
              <label>Preview</label>
              <iframe className={styles.preview} title="Email preview" sandbox="" srcDoc={previewHtml} />
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <div className={styles.panel}>
        <div><Button onClick={submit} disabled={save.isPending || !data.isPremiumPlus || !dirty || (mode === "own" && !data.serverReady)}>{save.isPending ? "Saving…" : "Save email settings"}</Button></div>
        {data.configured && (
          <p className={styles.hint}>
            {mode === "own" ? (data.verified ? "Working: a test email was delivered." : "Not tested yet. You can only send after a test email succeeds.") : "Send yourself a test to see exactly what customers will get."}
            {data.lastError ? ` Last problem: ${data.lastError}` : ""}
          </p>
        )}
        <div>
          <Button variant="outline" onClick={sendTest} disabled={test.isPending || dirty || !data.isPremiumPlus || (mode === "platform" && !data.platformReady) || (mode === "own" && !data.configured)}>
            {test.isPending ? "Sending test…" : "Send me a test email"}
          </Button>
          {dirty && <p className={styles.hint}>Save your changes before sending a test.</p>}
        </div>
        {mode === "own" && data.webhookUrl && (
          <div className={styles.field}>
            <label>Bounce and unsubscribe webhook (optional)</label>
            <Input readOnly value={data.webhookUrl} onFocus={(e) => e.currentTarget.select()} />
            <p className={styles.hint}>Paste this into your provider's webhook settings so bounced and unsubscribed addresses are skipped automatically.</p>
          </div>
        )}
      </div>
    </>
  );
}

function SettingsPanel() {
  const { data, isFetching, error } = useEmailSettings();
  if (isFetching && !data) return <section className={styles.panel}><Skeleton style={{ height: 200 }} /></section>;
  if (error || !data) return <section className={styles.panel}><h2>Email settings</h2><p className={styles.hint}>Could not load your email settings.</p></section>;
  return <SettingsForm key={`${data.provider}-${data.verified}-${data.configured}`} data={data} />;
}

function SentPanel({ onCompose }: { onCompose: () => void }) {
  const { data, isFetching, error } = useEmailOverview();
  if (isFetching && !data) return <Skeleton style={{ height: 200 }} />;
  if (error || !data) return <p className={styles.hint}>Could not load your sent emails. Please try again.</p>;
  return (
    <section className={styles.panel}>
      <h2>Sent</h2>
      {data.campaigns.length === 0 ? (
        <>
          <p className={styles.hint}>You haven't sent any emails yet. Your first one will show here.</p>
          <div><Button onClick={onCompose}>Write an email</Button></div>
        </>
      ) : (
        <div className={styles.history}>
          {data.campaigns.map((c) => (
            <details className={styles.historyRow} key={c.id}>
              <summary>
                <strong>{c.subject}</strong>
                <span className={styles.meta}>{c.audienceLabel} · {c.sentCount} sent{c.failedCount ? ` · ${c.failedCount} failed` : ""} · {new Date(c.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                {c.error && <span className={styles.meta}>{c.error}</span>}
              </summary>
              {c.message && <p className={styles.sentBody}>{c.message}</p>}
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

export default function EmailPage() {
  const [tab, setTab] = useState("sent");
  const [compose, setCompose] = useState<{ key: number; initial: ComposeInitial }>({ key: 0, initial: EMPTY_COMPOSE });
  const { data } = useEmailWorkspace();
  const unread = data?.unread ?? 0;

  const openCompose = (initial: ComposeInitial = EMPTY_COMPOSE) => {
    setCompose((c) => ({ key: c.key + 1, initial }));
    setTab("compose");
  };

  return (
    <div className={styles.page}>
      
      <div className={styles.head}>
        <h1>Email</h1>
        <p>Write to your customers, event participants and contacts. Your business details go with every email, and people who unsubscribe are never emailed again.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <div className={styles.tabScroll}>
          <TabsList>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="drafts">Drafts{data && data.drafts.length > 0 ? ` (${data.drafts.length})` : ""}</TabsTrigger>
            <TabsTrigger value="inbox">Inbox{unread > 0 && <span className={styles.badge}>{unread}</span>}</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="automatic">Automatic</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="sent"><SentPanel onCompose={() => openCompose()} /></TabsContent>
        <TabsContent value="compose"><EmailCompose key={compose.key} initial={compose.initial} /></TabsContent>
        <TabsContent value="drafts"><EmailDrafts onOpen={openCompose} /></TabsContent>
        <TabsContent value="inbox"><EmailInbox onReply={openCompose} /></TabsContent>
        <TabsContent value="templates"><EmailTemplates onUse={openCompose} /></TabsContent>
        <TabsContent value="automatic"><EmailAutomations /></TabsContent>
        <TabsContent value="contacts"><EmailContacts onEmail={openCompose} /></TabsContent>
        <TabsContent value="settings"><div className={styles.page}><SettingsPanel /></div></TabsContent>
      </Tabs>
    </div>
  );
}
