import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import superjson from "superjson";
import { CheckCircle2, Copy, Globe2, Plus, RefreshCw } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import styles from "./dashboard.domains.module.css";

type Domain = {
  id: string; hostname: string; domain_type: string; status: string;
  ssl_status: string; is_primary: boolean; verified_at: string | null;
};
type DomainResponse = { domains: Domain[] };
type AddResponse = {
  domain: { id: string; hostname: string; status: string; sslStatus: string };
  dns: {
    verification: { type: string; name: string; value: string };
    routing: { type: string; name: string; value: string } | null;
  };
  notice: string;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const raw = await response.text();
  const parsed = superjson.parse<{ error?: string } & T>(raw);
  if (!response.ok) throw new Error(parsed.error || "Request failed.");
  return parsed;
}

export default function DashboardDomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [hostname, setHostname] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<AddResponse | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api<DomainResponse>("/_api/business/domains");
      setDomains(result.domains);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load domains.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const addDomain = async () => {
    if (!hostname.trim()) { toast.error("Enter a domain name."); return; }
    setSaving(true);
    try {
      const result = await api<AddResponse>("/_api/business/domains", {
        method: "POST", body: JSON.stringify({ hostname }),
      });
      setInstructions(result);
      setHostname("");
      toast.success("Domain added. Publish the TXT record to verify ownership.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add domain.");
    } finally { setSaving(false); }
  };

  const verify = async (domainId: string) => {
    setCheckingId(domainId);
    try {
      const result = await api<{ verified: boolean; message?: string }>("/_api/business/domains/verify", {
        method: "POST", body: JSON.stringify({ domainId }),
      });
      toast.success(result.message || "Domain ownership verified.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed.");
    } finally { setCheckingId(null); }
  };

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); toast.success("Copied."); }
    catch { toast.error("Could not copy. Select and copy the value manually."); }
  };

  return <div className={styles.page}>
    <Helmet><title>Domains — Oni247</title></Helmet>
    <header className={styles.head}>
      <div><h1 className={styles.title}>Domains</h1><p className={styles.subtitle}>Connect a domain you own to your Oni247 business page. Your free Oni247 address remains available.</p></div>
    </header>

    <section className={styles.panel}>
      <div className={styles.panelTitle}><Globe2 size={19}/><h2>Connect your domain</h2></div>
      <p className={styles.help}>Enter a domain you already own, such as <strong>example.com</strong> or <strong>www.example.com</strong>. Do not include https:// or a page path.</p>
      <div className={styles.addRow}>
        <Input value={hostname} onChange={event => setHostname(event.target.value)} placeholder="www.example.com" autoComplete="url" />
        <Button onClick={() => void addDomain()} disabled={saving || !hostname.trim()}>{saving ? "Adding…" : <><Plus size={16}/> Add domain</>}</Button>
      </div>
    </section>

    {instructions && <section className={styles.panel}>
      <div className={styles.panelTitle}><CheckCircle2 size={19}/><h2>DNS verification instructions</h2></div>
      <p className={styles.help}>Add this TXT record in the DNS settings where you purchased your domain. DNS changes can take time to appear.</p>
      <div className={styles.record}>
        <span>TXT record name / host</span><code>{instructions.dns.verification.name}</code>
        <Button size="sm" variant="outline" onClick={() => void copy(instructions.dns.verification.name)}><Copy size={14}/> Copy</Button>
      </div>
      <div className={styles.record}>
        <span>TXT record value</span><code>{instructions.dns.verification.value}</code>
        <Button size="sm" variant="outline" onClick={() => void copy(instructions.dns.verification.value)}><Copy size={14}/> Copy</Button>
      </div>
      {instructions.dns.routing ? <div className={styles.record}>
        <span>Routing record (not yet an activation signal)</span><code>{instructions.dns.routing.name} → {instructions.dns.routing.value}</code>
        <Button size="sm" variant="outline" onClick={() => void copy(instructions.dns.routing!.value)}><Copy size={14}/> Copy target</Button>
      </div> : <p className={styles.warning}>Routing instructions are not available yet. Oni247's hosting target must be configured before customer domains can be routed.</p>}
      <p className={styles.warning}>{instructions.notice}</p>
    </section>}

    <section className={styles.panel}>
      <div className={styles.listHead}><h2>Your domains</h2><Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw size={14}/> Refresh</Button></div>
      {loading ? <Skeleton className={styles.skeleton}/> : domains.length === 0 ? <p className={styles.empty}>No custom domains connected yet.</p> : <div className={styles.domainList}>
        {domains.map(domain => <article className={styles.domain} key={domain.id}>
          <div className={styles.domainInfo}><strong>{domain.hostname}</strong><span>{domain.domain_type === "platform_subdomain" ? "Oni247 subdomain" : "Customer-owned domain"}</span></div>
          <div className={styles.statuses}><span className={styles.status}>{domain.status}</span><span className={styles.status}>SSL: {domain.ssl_status}</span>{domain.is_primary && <span className={styles.primary}>Primary</span>}</div>
          {domain.status === "pending" && <Button size="sm" variant="outline" disabled={checkingId === domain.id} onClick={() => void verify(domain.id)}>{checkingId === domain.id ? "Checking…" : "Verify TXT record"}</Button>}
          {domain.status === "verified" && <p className={styles.warning}>Ownership verified. SSL provisioning and activation are still pending.</p>}
        </article>)}
      </div>}
    </section>
  </div>;
}
