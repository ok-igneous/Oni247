import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { useReports } from "../helpers/useReports";
import { useSubscriptionStatus } from "../helpers/useSubscriptionStatus";
import { formatMoney } from "../helpers/formatMoney";
import styles from "./dashboard.reports.module.css";
   10	export default function ReportsPage(){
   11	 const [range,setRange]=useState("30");
   12	 const dates=useMemo(()=>{const to=new Date();const from=new Date(to);if(range!=="custom")from.setDate(to.getDate()-Number(range)+1);return {from:range==="custom"?undefined:from.toISOString(),to:range==="custom"?undefined:to.toISOString()};},[range]);
   13	 const {data:plan}=useSubscriptionStatus(); const {data,isFetching,error}=useReports(dates);
   14	 if(!plan?.isPremium)return <div className={styles.page}><Helmet><title>Reports — Oniduka</title></Helmet><h1>Reports & ROI</h1><p>Premium unlocks revenue, gross profit and ROI reporting.</p><Button asChild><Link to="/dashboard/plan">Upgrade to Premium</Link></Button></div>;
   15	 if(isFetching&&!data)return <div className={styles.page}><Skeleton className={styles.skeleton}/></div>;
   16	 if(error||!data)return <div className={styles.page}><h1>Reports</h1><p>Could not load the report.</p></div>;
   17	 return <div className={styles.page}><Helmet><title>Reports — Oniduka</title></Helmet><div className={styles.head}><div><h1>Reports</h1><p>Gross performance only — not full business net profit.</p></div><select value={range} onChange={e=>setRange(e.target.value)}><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></div><div className={styles.grid}>{[["Revenue",formatMoney(data.revenue,"NGN")],["COGS",formatMoney(data.cogs,"NGN")],["Gross profit",formatMoney(data.grossProfit,"NGN")],["Gross margin",data.grossMargin==null?"—":`${data.grossMargin.toFixed(2)}%`],["ROI",data.roi==null?"ROI unavailable — add product cost.":`${data.roi.toFixed(2)}%`],["Orders",String(data.orderCount)],["Units sold",String(data.unitsSold)]].map(([a,b])=><div className={styles.card} key={a}><span>{a}</span><strong>{b}</strong></div>)}</div><h2>Top products</h2>{data.topProducts.length===0?<p>No completed orders with product costs yet.</p>:<ul>{data.topProducts.map(p=><li key={p.name}>{p.name} — {p.units} units · {formatMoney(p.revenue,"NGN")} revenue · {formatMoney(p.grossProfit,"NGN")} gross profit</li>)}</ul>}</div>;
   18	}
