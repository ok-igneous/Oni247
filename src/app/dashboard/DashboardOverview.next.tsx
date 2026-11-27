"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Skeleton } from "../../../components/Skeleton";
import { useDashboardOverview } from "../../../helpers/useDashboardOverview";
import styles from "../../../legacy-pages/dashboard.module.css";

export default function DashboardOverviewNext() {
  const { data, isFetching, error } = useDashboardOverview();
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { setCopied(false); }
  };

  if (isFetching && !data) return <div className={styles.page}>
    <Skeleton className={styles.skeletonTitle} /><Skeleton className={styles.skeletonBlock} />
  </div>;

  if (error) return <div className={styles.page}>
    <h1 className={styles.title}>Overview</h1>
    <p className={styles.errorText}>Could not load your dashboard. Refresh the page and try again.</p>
  </div>;

  if (!data || !data.hasBusiness) return <div className={styles.page}>
    <h1 className={styles.title}>Set up your business</h1>
    <div className={styles.emptyState}>
      <p className={styles.emptyBody}>You have not created your business page yet. Add your business name,
        WhatsApp number and contact details, and your page address is ready to share.</p>
      <Button asChild><Link href="/dashboard/business">Create business page</Link></Button>
    </div>
  </div>;

  const pageUrl = origin ? `${origin}/${data.slug}` : `/${data.slug}`;
  const isPublished = data.status === "published";

  return <div className={styles.page}>
    <div className={styles.head}>
      <h1 className={styles.title}>{data.businessName}</h1>
      <Badge variant={isPublished ? "success" : "secondary"}>{isPublished ? "Published" : "Draft"}</Badge>
    </div>
    {!isPublished && <p className={styles.notice}>Your page is not public yet. Set it to published under Business when you are ready to share the link.</p>}
    <section className={styles.linkRow}>
      <span className={styles.linkLabel}>Your page address</span>
      <code className={styles.link}>{pageUrl}</code>
      <div className={styles.linkActions}>
        <Button variant="outline" size="sm" onClick={() => void copyLink(pageUrl)}>
          {copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? "Copied" : "Copy"}
        </Button>
        <Button asChild variant="ghost" size="sm">
          <a href={pageUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Open</a>
        </Button>
      </div>
    </section>
    <section className={styles.stats}>
      <Link href="/dashboard/products" className={styles.stat}><span className={styles.statValue}>{data.productCount}</span><span className={styles.statLabel}>Products</span></Link>
      <Link href="/dashboard/categories" className={styles.stat}><span className={styles.statValue}>{data.categoryCount}</span><span className={styles.statLabel}>Categories</span></Link>
      <Link href="/dashboard/enquiries" className={styles.stat}><span className={styles.statValue}>{data.newEnquiryCount}</span><span className={styles.statLabel}>New enquiries</span></Link>
      <Link href="/dashboard/orders" className={styles.stat}><span className={styles.statValue}>{data.pendingOrderCount}</span><span className={styles.statLabel}>Pending orders</span></Link>
    </section>
    <div className={styles.quickLinks}>
      <Button asChild variant="outline"><Link href="/dashboard/orders">Manage orders</Link></Button>
      <Button asChild variant="outline"><Link href="/dashboard/products">Manage products</Link></Button>
    </div>
  </div>;
}
