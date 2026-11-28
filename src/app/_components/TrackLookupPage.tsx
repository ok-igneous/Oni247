"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, PackageSearch, X } from "lucide-react";
import { Button } from "../../../components/Button";
import { Input } from "../components/Input";
import { formatMoney } from "../../../helpers/formatMoney";
import { useMyOrders } from "../helpers/useMyOrders";
import styles from "./track.module.css";

const TrackLookupPage = () => {
  const router = useRouter();
  const [code, setCode] = useState("");
  const { orders, forget } = useMyOrders();

  const go = () => {
    const clean = code.trim().toUpperCase();
    if (clean.length >= 6) router.push(`/track/${clean}`);
  };

  return (
    <div className={styles.site}>
      

      <header className={styles.header}>
        <Link href="/" className={styles.brand}><span className={styles.brandMark}>O</span><span><strong>Oni247</strong><small>Business storefronts</small></span></Link>
        <nav><Link href="/">Home</Link></nav>
      </header>
      <main className={styles.content}>
      <div className={styles.card}>
        <PackageSearch size={28} className={styles.icon} />
        <h1 className={styles.title}>Track your order</h1>
        <p className={styles.body}>
          Enter the reference code the shop sent you. No account needed.
        </p>
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          onKeyDown={(event) => {
            if (event.key === "Enter") go();
          }}
          placeholder="e.g. K7M2QX4P"
          aria-label="Order reference code"
          className={styles.input}
        />
        <Button onClick={go} disabled={code.trim().length < 6} size="lg">
          Check order
        </Button>
      </div>

      {orders.length > 0 && (
        <div className={styles.card}>
          <h2 className={styles.subtitle}>Your orders on this device</h2>
          <p className={styles.body}>
            Saved in this browser only. Clearing your browsing data removes
            them, so keep your codes somewhere safe too.
          </p>
          <ul className={styles.list}>
            {orders.map((order) => (
              <li key={order.code} className={styles.row}>
                <Link href={`/track/${order.code}`} className={styles.rowLink}>
                  <span className={styles.rowText}>
                    <span className={styles.rowShop}>{order.businessName}</span>
                    <span className={styles.rowMeta}>
                      {order.code} ·{" "}
                      {formatMoney(order.total, order.currency)} ·{" "}
                      {new Date(order.placedAt).toLocaleDateString()}
                    </span>
                  </span>
                  <ChevronRight size={16} className={styles.chevron} />
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${order.code} from this list`}
                  onClick={() => forget(order.code)}
                >
                  <X size={14} />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      </main>
      <footer className={styles.footer}>Secure order tracking · Powered by Oni247</footer>
    </div>
  );
};

export default TrackLookupPage;