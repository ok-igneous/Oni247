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
  render_verification_status: string; last_error: string | null; last_checked_at: string | null;
  is_default?: boolean;
};
type DomainResponse = { domains: Domain[]; customDomainsAllowed: boolean };
type AddResponse = {
  domain: { id: string; hostname: string; status: string; sslStatus: string };
  dns: {
    verification: { type: string; name: string; value: string };
    routing: Array<{ type: string; name: string; value: string }>;
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
  const [customDomainsAllowed, setCustomDomainsAllowed] = useState(false);
  const [hostname, setHostname] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<AddResponse | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api<DomainResponse>("/_api/business/domains");
      setDomains(result.domains);
      setCustomDomainsAllowed(result.customDomainsAllowed);
      if (!result.customDomainsAllowed) setInstructions(null);
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

  const setPrimary = async (domainId: string) => {
    try {
      await api<{ success: boolean }>("/_api/business/domains/primary", {
        method: "POST", body: JSON.stringify({ domainId }),
      });
      toast.success("Primary domain updated.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not set primary domain.");
    }
  };

  const removeDomain = async (domain: Domain) => {
    if (!window.confirm(`Remove ${domain.hostname} from your business page? This also removes its Render custom-domain configuration.`)) return;
    try {
      await api<{ success: boolean }>("/_api/business/domains", {
        method: "DELETE", body: JSON.stringify({ domainId: domain.id }),
      });
      toast.success("Domain removed.");
      if (instructions?.domain.hostname === domain.hostname) setInstructions(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove domain.");
    }
  };

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); toast.success("Copied."); }
    catch { toast.error("Could not copy. Select and copy the value manually."); }
  };

  return <div className={styles.page}>
    <Helmet><title>Domains — Oni247</title></Helmet>
    <header className={styles.head}>
      <div><h1 className={styles.title}>Domains</h1><p className={styles.subtitle}>Connect a domain you own to your Oni247 business page. Your free oni247.org/slug address remains available.</p></div>
    </header>

    <section className={styles.panel}>
      <div className={styles.panelTitle}><Globe2 size={19}/><h2>Connect your domain</h2></div>
      <p className={styles.help}>Enter the root domain you own, such as <strong>example.com</strong> or <strong>example.com.ng</strong>, or its <strong>www</strong> hostname. Oni247 configures the root and www records together so Render can redirect the secondary address. Do not include https:// or a page path.</p>
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
      {instructions.dns.routing.length > 0 ? instructions.dns.routing.map((record) => <div className={styles.record} key={record.type + record.name}>
        <span>{record.type} record · {record.name}</span><code>{record.value}</code>
        <Button size="sm" variant="outline" onClick={() => void copy(record.value)}><Copy size={14}/> Copy</Button>
      </div>) : <p className={styles.warning}>Routing instructions are not available yet. Configure the Render service hostname before customer domains can be routed.</p>}
      <p className={styles.warning}>{instructions.notice}</p>
    </section>}

    <section className={styles.panel}>
      <div className={styles.listHead}><h2>Your domains</h2><Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw size={14}/> Refresh</Button></div>
      {loading ? <Skeleton className={styles.skeleton}/> : domains.length === 0 ? <p className={styles.empty}>No custom domains connected yet.</p> : <div className={styles.domainList}>
        {domains.map(domain => <article className={styles.domain} key={domain.id}>
          <div className={styles.domainInfo}><strong>{domain.hostname}</strong><span>{domain.domain_type === "oni247_path" ? "Default Oni247 URL" : "Customer-owned domain"}</span></div>
          <div className={styles.statuses}><span className={styles.status}>{domain.status}</span><span className={styles.status}>SSL: {domain.ssl_status}</span>{domain.is_primary && domain.status === "active" && domain.ssl_status === "active" && <span className={styles.primary}>Primary</span>}</div>
          {domain.domain_type === "customer_domain" && (domain.status === "pending" || domain.status === "verified") && <Button size="sm" variant="outline" disabled={checkingId === domain.id} onClick={() => void verify(domain.id)}>{checkingId === domain.id ? "Checking…" : domain.status === "pending" ? "Verify domain" : "Check DNS & SSL"}</Button>}
          {domain.is_default && domain.status === "pending" && <p className={styles.warning}>Your default Oni247 /slug address does not require a separate domain setup.</p>}
          {domain.status === "verified" && <p className={styles.warning}>Ownership verified. Render DNS verification or HTTPS certificate provisioning may still be in progress. Check again after a few minutes.</p>}
          {domain.status === "active" && <p className={styles.warning}>{domain.is_default ? "Your default Oni247 /slug address is ready." : "Your domain is connected and HTTPS is verified."}</p>}
          {domain.render_verification_status === "error" && domain.last_error && <p className={styles.warning}>{domain.last_error}</p>}
          {domain.status === "failed" && <p className={styles.warning}>Domain setup failed. Contact support with this hostname.</p>}
          {domain.status === "active" && !domain.is_primary && <Button size="sm" variant="outline" onClick={() => void setPrimary(domain.id)}>Set as primary</Button>}
          {!domain.is_default && <Button size="sm" variant="ghost" onClick={() => void removeDomain(domain)}>Remove</Button>}
        </article>)}
      </div>}
    </section>
  </div>;
}
