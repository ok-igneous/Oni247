import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { getTraffic } from "../endpoints/traffic_GET.schema";
import styles from "./dashboard.traffic.module.css";

export default function TrafficPage() {
   10	  const [range, setRange] = useState<"1" | "7" | "30">("30");
   11	  const dates = useMemo(() => {
   12	    const to = new Date(); const from = new Date(to);
   13	    from.setDate(to.getDate() - Number(range) + 1);
   14	    return { from: from.toISOString(), to: to.toISOString() };
   15	  }, [range]);
   16	  const { data, isFetching, error } = useQuery({ queryKey: ["traffic", dates], queryFn: () => getTraffic(dates), retry: false });
   17	  if (isFetching && !data) return <div className={styles.page}><Skeleton className={styles.skeleton} /></div>;
   18	  return <div className={styles.page}>
   19	    <Helmet><title>Traffic — Oniduka</title></Helmet>
   20	    <div className={styles.head}><div><h1>Traffic & conversion</h1><p>Understand visits and the actions they lead to.</p></div><div className={styles.range}>
   21	      {([["1","Today"],["7","7 days"],["30","30 days"]] as const).map(([value,label]) => <Button key={value} size="sm" variant={range === value ? "primary" : "outline"} onClick={() => setRange(value)}>{label}</Button>)}
   22	    </div></div>
   23	    <section className={styles.notice}><strong>Visitor traffic is tracked automatically.</strong><p>Oniduka uses Floot Analytics for page views, sessions, referrers, device information and custom storefront events. Use the project Analytics tab for visitor traffic. This dashboard keeps business conversion data separate from visitor telemetry.</p></section>
   24	    {error || !data ? <p className={styles.error}>Could not load conversion data.</p> : <div className={styles.grid}>
   25	      <div className={styles.card}><span>Enquiries</span><strong>{data.enquiries}</strong></div>
   26	      <div className={styles.card}><span>Orders</span><strong>{data.orders}</strong></div>
   27	      <div className={styles.card}><span>Completed orders</span><strong>{data.completedOrders}</strong></div>
   28	      <div className={styles.card}><span>Order conversion</span><strong>{data.conversionRate == null ? "—" : `${data.conversionRate.toFixed(1)}%`}</strong></div>
   29	    </div>}
   30	  </div>;
   31	}