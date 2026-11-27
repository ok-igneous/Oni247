"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, PackageSearch, Search, X } from "lucide-react";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/Input";
import { formatMoney } from "../../../helpers/formatMoney";
import { useMyOrders } from "../../../helpers/useMyOrders";
import { useStorefront } from "../../../helpers/useStorefront";
import styles from "../../../pages/track.module.css";

export default function TrackEntryNext({ slug, customDomain = false }: { slug?: string; customDomain?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const { data, isFetching } = useStorefront(slug);
  const { orders, forget } = useMyOrders();
  const clean = code.trim().replace(/\s+/g, "").toUpperCase();
  const go = () => {
    if (clean.length < 6) return;
    const path = customDomain ? `/track/${encodeURIComponent(clean)}` : slug ? `/${encodeURIComponent(slug)}/track/${encodeURIComponent(clean)}` : `/track/${encodeURIComponent(clean)}`;
    router.push(path);
  };
  const savedOrders = slug ? orders.filter((order) => order.slug === slug) : orders;
  const home = customDomain ? "/" : slug ? `/${encodeURIComponent(slug)}` : "/";
  return <div className={styles.site}>
    <header className={styles.header}>
      <Link href={home} className={styles.brand}><span className={styles.brandMark}>O</span><span><strong>{data?.business.name ?? "Oni247"}</strong><small>{slug ? "Order tracking" : "Business storefronts"}</small></span></Link>
      <nav><Link href={home}>Home</Link></nav>
    </header>
    <main className={styles.content}>
      <div className={styles.card}>
        <PackageSearch size={28} className={styles.icon} />
        <h1 className={styles.title}>Track your order</h1>
        <p className={styles.body}>{slug ? isFetching ? "Loading shop…" : `Enter the tracking code supplied by ${data?.business.name ?? "this business"}.` : "Enter the reference code the shop sent you. No account needed."}</p>
        <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === "Enter") go(); }} placeholder="e.g. K7M2QX4P" aria-label="Order reference code" className={styles.input} />
        <Button onClick={go} disabled={clean.length < 6} size="lg"><Search size={16}/> Check order</Button>
      </div>
      {!slug && savedOrders.length > 0 && <div className={styles.card}>
        <h2 className={styles.subtitle}>Your orders on this device</h2>
        <p className={styles.body}>Saved in this browser only. Clearing your browsing data removes them, so keep your codes somewhere safe too.</p>
        <ul className={styles.list}>{savedOrders.map((order) => <li key={order.code} className={styles.row}>
          <Link href={`/track/${encodeURIComponent(order.code)}`} className={styles.rowLink}>
            <span className={styles.rowText}><span className={styles.rowShop}>{order.businessName}</span><span className={styles.rowMeta}>{order.code} · {formatMoney(order.total, order.currency)} · {new Date(order.placedAt).toLocaleDateString()}</span></span>
            <ChevronRight size={16} className={styles.chevron}/>
          </Link>
          <Button variant="ghost" size="icon-sm" aria-label={`Remove ${order.code} from this list`} onClick={() => forget(order.code)}><X size={14}/></Button>
        </li>)}</ul>
      </div>}
    </main>
    <footer className={styles.footer}>Secure order tracking · Powered by Oni247</footer>
  </div>;
}
