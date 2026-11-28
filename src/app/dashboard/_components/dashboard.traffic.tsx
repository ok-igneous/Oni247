"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Download, Minus } from "lucide-react";
import { Button } from "../../../../components/Button";
import { Skeleton } from "../../../../components/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/Tabs";
import { getAnalytics, type Count, type OutputType } from "../../../../endpoints/analytics/summary_GET.schema";
import styles from "./dashboard.traffic.module.css";

const RANGES = [[1, "Today"], [7, "7 days"], [30, "30 days"], [90, "90 days"]] as const;

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
};

const Delta = ({ now, before }: { now: number | null; before: number | null | undefined }) => {
  if (now == null || before == null) return <small className={styles.deltaFlat}>—</small>;
  if (before === 0) return now > 0 ? <small className={styles.deltaUp}><ArrowUpRight size={13} /> New</small> : <small className={styles.deltaFlat}><Minus size={13} /> No change</small>;
  const pct = ((now - before) / before) * 100;
  if (Math.abs(pct) < 0.5) return <small className={styles.deltaFlat}><Minus size={13} /> No change</small>;
  const up = pct > 0;
  return (
    <small className={up ? styles.deltaUp : styles.deltaDown}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {Math.abs(pct).toFixed(0)}% vs before
    </small>
  );
};

const Kpi = ({ label, value, now, before, hint }: { label: string; value: string; now: number | null; before?: number | null; hint?: string }) => (
  <div className={styles.card} title={hint}>
    <span>{label}</span>
    <strong>{value}</strong>
    <Delta now={now} before={before} />
  </div>
);

const List = ({ title, rows, empty, total }: { title: string; rows: Count[]; empty: string; total?: number }) => {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className={styles.panel}>
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className={styles.muted}>{empty}</p>
      ) : (
        <ul className={styles.rows}>
          {rows.map((row) => (
            <li key={row.name}>
              <span className={styles.rowName}>{row.name}</span>
              <span className={styles.rowBar}><i style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }} /></span>
              <b>{row.count}{total ? <em> {Math.round((row.count / total) * 100)}%</em> : null}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const Chart = ({ daily }: { daily: OutputType["daily"] }) => {
  const W = 640;
  const H = 180;
  const pad = 6;
  const peak = Math.max(1, ...daily.map((d) => d.views));
  const step = daily.length > 1 ? (W - pad * 2) / (daily.length - 1) : 0;
  const y = (value: number) => H - pad - (value / peak) * (H - pad * 2);
  const line = (pick: (d: OutputType["daily"][number]) => number) =>
    daily.map((d, i) => `${i === 0 ? "M" : "L"}${(pad + i * step).toFixed(1)},${y(pick(d)).toFixed(1)}`).join(" ");
  const area = `${line((d) => d.views)} L${(pad + (daily.length - 1) * step).toFixed(1)},${H - pad} L${pad},${H - pad} Z`;
  return (
    <div>
      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Page views and visitors per day">
        {[0.25, 0.5, 0.75].map((t) => <line key={t} x1="0" x2={W} y1={H * t} y2={H * t} className={styles.grid2} />)}
        <path d={area} className={styles.area} />
        <path d={line((d) => d.views)} className={styles.lineViews} />
        <path d={line((d) => d.visitors)} className={styles.lineVisitors} />
        {daily.map((d, i) => (
          <circle key={d.date} cx={pad + i * step} cy={y(d.views)} r="5" className={styles.dot}>
            <title>{`${d.date}: ${d.views} views, ${d.visitors} visitors`}</title>
          </circle>
        ))}
      </svg>
      <div className={styles.legend}>
        <span><i className={styles.keyViews} /> Page views</span>
        <span><i className={styles.keyVisitors} /> Visitors</span>
        <span className={styles.axis}>{daily[0]?.date} → {daily[daily.length - 1]?.date}</span>
      </div>
    </div>
  );
};

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;

const exportCsv = (data: OutputType) => {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: string[] = [];
  lines.push(["Date", "Page views", "Visitors"].map(q).join(","));
  data.daily.forEach((d) => lines.push([d.date, d.views, d.visitors].map(q).join(",")));
  lines.push("");
  lines.push(["Top pages", "Views"].map(q).join(","));
  data.topPages.forEach((r) => lines.push([r.name, r.count].map(q).join(",")));
  lines.push("");
  lines.push(["Source", "Views"].map(q).join(","));
  data.sources.forEach((r) => lines.push([r.name, r.count].map(q).join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `traffic-last-${data.days}-days.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function TrafficPage() {
  const [days, setDays] = useState<1 | 7 | 30 | 90>(30);
  const { data, isFetching, error } = useQuery({
    queryKey: ["analytics", days],
    queryFn: () => getAnalytics(days),
    retry: false,
    placeholderData: (previous) => previous,
  });

  if (isFetching && !data) return <div className={styles.page}><Skeleton className={styles.skeleton} /></div>;

  const hours = data?.hours ?? [];
  const hourPeak = Math.max(1, ...hours);
  const busiest = hours.length ? hours.indexOf(Math.max(...hours)) : -1;
  const funnel = data?.funnel ?? [];
  const funnelTop = Math.max(1, funnel[0]?.count ?? 1);
  const known = (data?.newVisitors ?? 0) + (data?.returningVisitors ?? 0);
  const prev = data?.previous;

  return (
    <div className={styles.page}>
      
      <div className={styles.head}>
        <div>
          <h1>Traffic &amp; conversion</h1>
          <p>Who visits your website, where they come from and what they do next. Counted by Oni247 itself, no outside tools needed. Times are Nigeria time.</p>
        </div>
        <div className={styles.tools}>
          <div className={styles.range} role="group" aria-label="Time range">
            {RANGES.map(([value, label]) => (
              <Button key={value} size="sm" variant={days === value ? "primary" : "outline"} onClick={() => setDays(value)}>{label}</Button>
            ))}
          </div>
          {data && <Button size="sm" variant="ghost" onClick={() => exportCsv(data)}><Download size={14} /> Export CSV</Button>}
        </div>
      </div>

      {error || !data ? (
        <p className={styles.error}>Could not load your traffic. Please try again.</p>
      ) : (
        <>
          <Tabs defaultValue="overview">
          <div className={styles.tabScroll}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="visitors">Visitors</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>
          </div>
          <TabsContent value="overview">
          <div className={styles.grid}>
            <Kpi label="Visitors" value={String(data.visitors)} now={data.visitors} before={prev?.visitors} hint="Different people who opened your site" />
            <Kpi label="Page views" value={String(data.pageViews)} now={data.pageViews} before={prev?.pageViews} />
            <Kpi label="Orders" value={String(data.orders)} now={data.orders} before={prev?.orders} />
            <Kpi label="Order value" value={money(data.revenue, data.currency)} now={data.revenue} before={prev?.revenue} />
            <Kpi label="Visitors who ordered" value={data.conversionRate == null ? "—" : `${data.conversionRate.toFixed(1)}%`} now={data.conversionRate} before={prev?.conversionRate} />
            <Kpi label="Pages per visitor" value={data.pagesPerVisitor == null ? "—" : data.pagesPerVisitor.toFixed(1)} now={null} />
            <Kpi label="WhatsApp taps" value={String(data.actions.whatsappClicks)} now={null} />
            <Kpi label="Calls and enquiries" value={String(data.actions.phoneClicks + data.actions.enquiries)} now={null} />
          </div>

          <section className={styles.panel}>
            <h2>Visits by day</h2>
            {data.pageViews === 0 ? (
              <p className={styles.muted}>No visits recorded in this period yet. Share your website link and visits will appear here as people open it.</p>
            ) : (
              <Chart daily={data.daily} />
            )}
          </section>

          </TabsContent>
          <TabsContent value="visitors">
          <div className={styles.two}>
            <section className={styles.panel}>
              <h2>From visit to order</h2>
              {funnel.length === 0 || funnelTop <= 0 || data.visitors === 0 ? (
                <p className={styles.muted}>Once people visit, you will see how many look at products and how many contact you or order.</p>
              ) : (
                <ul className={styles.funnel}>
                  {funnel.map((step, i) => (
                    <li key={step.label}>
                      <div className={styles.funnelHead}><span>{step.label}</span><b>{step.count}{i > 0 ? <em> {Math.round((step.count / funnelTop) * 100)}%</em> : null}</b></div>
                      <span className={styles.funnelBar}><i style={{ width: `${Math.max(3, (step.count / funnelTop) * 100)}%` }} /></span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className={styles.panel}>
              <h2>New and returning visitors</h2>
              {known === 0 ? (
                <p className={styles.muted}>No visitors yet.</p>
              ) : (
                <>
                  <div className={styles.split} role="img" aria-label="New versus returning visitors">
                    <i style={{ width: `${((data.newVisitors ?? 0) / known) * 100}%` }} />
                  </div>
                  <div className={styles.legend}>
                    <span><b>{data.newVisitors}</b> new</span>
                    <span><b>{data.returningVisitors}</b> came back</span>
                  </div>
                  <p className={styles.muted}>Returning means the same phone or browser also visited in the period before.</p>
                </>
              )}
            </section>
          </div>

          <section className={styles.panel}>
            <h2>When people visit{busiest >= 0 && hours[busiest] > 0 ? <small className={styles.peak}> Busiest around {hourLabel(busiest)}</small> : null}</h2>
            {hours.every((h) => h === 0) ? (
              <p className={styles.muted}>No visits yet.</p>
            ) : (
              <div className={styles.hours} role="img" aria-label="Page views by hour of the day">
                {hours.map((count, hour) => (
                  <div key={hour} className={styles.hourCol} title={`${hourLabel(hour)}: ${count} views`}>
                    <i style={{ height: `${Math.max(count ? 8 : 2, (count / hourPeak) * 100)}%` }} />
                    {hour % 6 === 0 && <span>{hourLabel(hour)}</span>}
                  </div>
                ))}
              </div>
            )}
          </section>

          </TabsContent>
          <TabsContent value="pages">
          <div className={styles.two}>
            <List title="Most visited pages" rows={data.topPages} empty="No pages visited yet." total={data.pageViews} />
            <List title="Most viewed products" rows={data.topProducts ?? []} empty="No product pages viewed yet." />
          </div>
          </TabsContent>
          <TabsContent value="sources">
          <div className={styles.two}>
            <List title="Where visitors come from" rows={data.sources} empty="No visits yet." total={data.pageViews} />
            <List title="Devices" rows={data.devices} empty="No visits yet." total={data.pageViews} />
          </div>
          </TabsContent>
          <TabsContent value="actions">
          <section className={styles.panel}>
            <h2>What visitors did</h2>
            <ul className={styles.rows}>
              <li><span className={styles.rowName}>Looked at products</span><span /><b>{data.actions.productViews}</b></li>
              <li><span className={styles.rowName}>Tapped WhatsApp</span><span /><b>{data.actions.whatsappClicks}</b></li>
              <li><span className={styles.rowName}>Tapped call</span><span /><b>{data.actions.phoneClicks}</b></li>
              <li><span className={styles.rowName}>Sent enquiries</span><span /><b>{data.actions.enquiries}</b></li>
              <li><span className={styles.rowName}>Tapped Register on events</span><span /><b>{data.actions.registerClicks}</b></li>
              <li><span className={styles.rowName}>Sent orders</span><span /><b>{data.actions.orders}</b></li>
            </ul>
          </section>
          </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
