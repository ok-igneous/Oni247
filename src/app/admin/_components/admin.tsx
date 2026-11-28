"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "../../../../components/Badge";
import { Skeleton } from "../../../../components/Skeleton";
import { formatMoney } from "../../../../helpers/formatMoney";
import { getAdminOverview } from "../../../../endpoints/admin/overview_GET.schema";
import { getAdminPayments } from "../../../../endpoints/admin/payments_GET.schema";
import styles from "./admin.module.css";

const AdminOverviewPage = () => {
  const overview = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => getAdminOverview(),
    retry: false,
  });
  const payments = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: () => getAdminPayments(),
    retry: false,
  });

  const data = overview.data;

  if (overview.isFetching && !data) {
    return (
      <div className={styles.page}>
        <Skeleton className={styles.skeletonTitle} />
        <Skeleton className={styles.skeletonBlock} />
      </div>
    );
  }

  if (overview.error || !data) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Overview</h1>
        <p className={styles.errorText}>
          {overview.error instanceof Error
            ? overview.error.message
            : "Could not load platform figures."}
        </p>
      </div>
    );
  }

  const groups = [
    {
      heading: "Shops",
      stats: [
        { label: "Businesses", value: String(data.businessCount) },
        { label: "Published", value: String(data.publishedCount) },
        { label: "Suspended", value: String(data.suspendedCount) },
        { label: "Owners", value: String(data.ownerCount) },
      ],
    },
    {
      heading: "Subscriptions",
      stats: [
        { label: "Premium active", value: String(data.premiumActiveCount) },
        { label: "On trial", value: String(data.trialCount) },
        { label: "Lapsed", value: String(data.lapsedCount) },
        {
          label: "Revenue collected",
          value: formatMoney(data.subscriptionRevenue, data.currency),
        },
      ],
    },
    {
      heading: "Activity",
      stats: [
        { label: "Products listed", value: String(data.productCount) },
        { label: "Orders placed", value: String(data.orderCount) },
        {
          label: "Order value",
          value: formatMoney(data.orderValue, data.currency),
        },
      ],
    },
  ];

  return (
    <div className={styles.page}>
      

      <h1 className={styles.title}>Platform overview</h1>

      {groups.map((group) => (
        <section key={group.heading} className={styles.group}>
          <h2 className={styles.groupHeading}>{group.heading}</h2>
          <div className={styles.stats}>
            {group.stats.map((stat) => (
              <div key={stat.label} className={styles.stat}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className={styles.group}>
        <h2 className={styles.groupHeading}>Recent payments</h2>
        {payments.isFetching && !payments.data ? (
          <Skeleton className={styles.skeletonBlock} />
        ) : (payments.data?.payments.length ?? 0) === 0 ? (
          <p className={styles.muted}>No subscription payments yet.</p>
        ) : (
          <ul className={styles.list}>
            {payments.data?.payments.map((payment) => (
              <li key={payment.id} className={styles.row}>
                <div className={styles.rowText}>
                  <span className={styles.rowName}>{payment.businessName}</span>
                  <span className={styles.rowMeta}>{payment.txRef}</span>
                </div>
                <span className={styles.amount}>
                  {formatMoney(payment.amount, payment.currency)}
                </span>
                <Badge
                  variant={
                    payment.status === "successful"
                      ? "success"
                      : payment.status === "failed"
                        ? "destructive"
                        : "warning"
                  }
                >
                  {payment.status}
                </Badge>
                <span className={styles.date}>
                  {new Date(payment.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AdminOverviewPage;
