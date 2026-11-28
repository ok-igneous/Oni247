"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Badge } from "../../../../components/Badge";
import { Skeleton } from "../../../../components/Skeleton";
import { PageHead } from "../../../../components/Panel";
import { SectionLayout, useSection, type SectionItem } from "../../../../components/SectionLayout";
import { useAdminSettings, useAdminSettingsAction } from "../../../../helpers/useAdminSettings";
import type { OutputType } from "../../../../endpoints/admin/settings_GET.schema";
import styles from "./admin.settings.module.css";

const SECTIONS: SectionItem[] = [
  { id: "mail", label: "Mail server", hint: "Sign-up and default sender" },
  { id: "payments", label: "Subscription payments", hint: "Flutterwave for plans" },
];

const copy = (text: string) => {
  void navigator.clipboard.writeText(text).then(() => toast.success("Copied.")).catch(() => toast.error("Could not copy."));
};

const useRun = () => {
  const act = useAdminSettingsAction();
  const [busy, setBusy] = useState(false);
  const run = async (body: Parameters<typeof act.mutateAsync>[0]) => {
    setBusy(true);
    try {
      const res = await act.mutateAsync(body);
      toast.success(res.message ?? "Saved.");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy };
};

const SmtpCard = ({ smtp, serverReady }: { smtp: OutputType["smtp"]; serverReady: boolean }) => {
  const { run, busy } = useRun();
  const [host, setHost] = useState(smtp.host);
  const [port, setPort] = useState(String(smtp.port));
  const [secure, setSecure] = useState(smtp.secure);
  const [user, setUser] = useState(smtp.user);
  const [pass, setPass] = useState("");
  const [fromEmail, setFromEmail] = useState(smtp.fromEmail);
  const [fromName, setFromName] = useState(smtp.fromName);
  const [inboxDomain, setInboxDomain] = useState(smtp.inboxDomain);
  const [inboundSecret, setInboundSecret] = useState("");

  const save = async () => {
    const ok = await run({
      op: "smtp.save",
      host,
      port: Number.parseInt(port, 10) || 587,
      secure,
      user,
      pass: pass || undefined,
      fromEmail,
      fromName,
      inboxDomain,
      inboundSecret: inboundSecret || undefined,
    });
    if (ok) {
      setPass("");
      setInboundSecret("");
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h2>Email: Oni247 mail server</h2>
        {smtp.ready ? <Badge variant="success">Ready</Badge> : <Badge variant="warning">Not set up</Badge>}
      </div>
      <p className={styles.muted}>
        This one mail server sends everything Oni247 emails by default: sign-up and password emails, and the default sender for shops that have not connected their own provider. It is plain SMTP, so any provider or your own mail server works and it stays with the app if you move it.
      </p>
      {!serverReady && <p className={styles.warn}>Secret storage is not set up. Add the EMAIL_SETTINGS_KEY secret first.</p>}
      {smtp.source === "env" && smtp.ready && <p className={styles.muted}>Currently using server environment settings. Saving here replaces them.</p>}
      <div className={styles.fields}>
        <label className={styles.field}><span>SMTP host</span><Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.yourprovider.com" /></label>
        <label className={styles.field}><span>Port</span><Input value={port} onChange={(e) => setPort(e.target.value)} inputMode="numeric" placeholder="587" /></label>
        <label className={styles.field}><span>Username</span><Input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="off" /></label>
        <label className={styles.field}><span>Password</span><Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" placeholder={smtp.hasPass ? "Saved. Type to replace." : ""} /></label>
        <label className={styles.field}><span>From address</span><Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="noreply@oni247.com" /></label>
        <label className={styles.field}><span>From name</span><Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Oni247" /></label>
        <label className={`${styles.check} ${styles.full}`}><input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} /> Use SSL/TLS from the start (usually port 465)</label>
        <label className={styles.field}>
          <span>Inbox domain (optional)</span>
          <Input value={inboxDomain} onChange={(e) => setInboxDomain(e.target.value)} placeholder="mail.oni247.com" />
          <small>Replies to a shop arrive at shop-name@this-domain and land in that shop's Inbox.</small>
        </label>
        <label className={styles.field}>
          <span>Inbound secret (optional)</span>
          <Input type="password" value={inboundSecret} onChange={(e) => setInboundSecret(e.target.value)} autoComplete="new-password" placeholder={smtp.hasInboundSecret ? "Saved. Type to replace." : "16+ characters"} />
          <small>Your mail forwarder sends it in the x-inbound-secret header.</small>
        </label>
        <div className={`${styles.field} ${styles.full}`}>
          <span>Inbound webhook link</span>
          <div className={styles.code}><code>{smtp.inboundUrl}</code><Button size="icon-sm" variant="ghost" aria-label="Copy inbound link" onClick={() => copy(smtp.inboundUrl)}><Copy size={14} /></Button></div>
        </div>
      </div>
      <div className={styles.actions}>
        <Button disabled={busy || !serverReady || !host || !fromEmail} onClick={() => void save()}>Save mail server</Button>
        <Button variant="outline" disabled={busy || !smtp.ready} onClick={() => void run({ op: "smtp.test" })}>Send me a test email</Button>
        {smtp.source === "admin" && <Button variant="ghost" disabled={busy} onClick={() => void run({ op: "smtp.remove" })}>Remove</Button>}
      </div>
    </section>
  );
};

const GatewayCard = ({ gateway, serverReady }: { gateway: OutputType["gateway"]; serverReady: boolean }) => {
  const { run, busy } = useRun();
  const [secretKey, setSecretKey] = useState("");
  const [webhookHash, setWebhookHash] = useState("");
  const save = async () => {
    const ok = await run({ op: "gateway.save", secretKey: secretKey || undefined, webhookHash: webhookHash || undefined });
    if (ok) {
      setSecretKey("");
      setWebhookHash("");
    }
  };
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h2>Subscription payments: Flutterwave</h2>
        {gateway.hasSecret ? (gateway.verified || gateway.source === "env" ? <Badge variant="success">Connected</Badge> : <Badge variant="warning">Not tested</Badge>) : <Badge variant="warning">Not set up</Badge>}
      </div>
      <p className={styles.muted}>
        This is the account that collects what shop owners pay Oni247 for their plans. It talks to Flutterwave directly, separate from the payment accounts shop owners connect for their own customers.
      </p>
      {gateway.source === "env" && <p className={styles.muted}>Currently using server environment keys. Saving here replaces them.</p>}
      <div className={styles.fields}>
        <label className={styles.field}><span>Secret key</span><Input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} autoComplete="off" placeholder={gateway.hasSecret ? "Saved. Type to replace." : "FLWSECK-…"} /></label>
        <label className={styles.field}><span>Webhook secret hash</span><Input type="password" value={webhookHash} onChange={(e) => setWebhookHash(e.target.value)} autoComplete="off" placeholder={gateway.hasWebhookHash ? "Saved. Type to replace." : "The secret hash you set in Flutterwave"} /></label>
        <div className={`${styles.field} ${styles.full}`}>
          <span>Webhook link to paste in Flutterwave (Settings → Webhooks)</span>
          <div className={styles.code}><code>{gateway.webhookUrl}</code><Button size="icon-sm" variant="ghost" aria-label="Copy webhook link" onClick={() => copy(gateway.webhookUrl)}><Copy size={14} /></Button></div>
        </div>
      </div>
      <div className={styles.actions}>
        <Button disabled={busy || !serverReady || (!secretKey && !webhookHash)} onClick={() => void save()}>Save keys</Button>
        <Button variant="outline" disabled={busy || !gateway.hasSecret} onClick={() => void run({ op: "gateway.test" })}>Test key</Button>
        {gateway.source === "admin" && <Button variant="ghost" disabled={busy} onClick={() => void run({ op: "gateway.remove" })}>Remove</Button>}
      </div>
    </section>
  );
};

const AdminSettingsPage = () => {
  const { data, isFetching, error } = useAdminSettings();
  const [section, setSection] = useSection(SECTIONS);
  return (
    <div className={styles.page}>
      
      <PageHead title="Platform settings" lead="Set up the services that run Oni247 itself. Keys are encrypted and never shown again after saving." />
      {isFetching && !data ? (
        <Skeleton className={styles.skeleton} />
      ) : error || !data ? (
        <p className={styles.error}>{error instanceof Error ? error.message : "Could not load settings."}</p>
      ) : (
        <SectionLayout
          title="Settings"
          items={SECTIONS.map((s) => (s.id === "mail" ? { ...s, badge: data.smtp.ready ? "On" : "Off" } : s.id === "payments" ? { ...s, badge: data.gateway.hasSecret ? "On" : "Off" } : s))}
          value={section}
          onChange={setSection}
        >
          {section === "mail" ? <SmtpCard smtp={data.smtp} serverReady={data.serverReady} /> : <GatewayCard gateway={data.gateway} serverReady={data.serverReady} />}
        </SectionLayout>
      )}
    </div>
  );
};

export default AdminSettingsPage;

