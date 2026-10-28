import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Badge } from "../components/Badge";
import { Skeleton } from "../components/Skeleton";
import { formatMoney } from "../helpers/formatMoney";
import { getAdminOverview } from "../endpoints/admin/overview_GET.schema";
import { getAdminPayments } from "../endpoints/admin/payments_GET.schema";
import styles from "./admin.module.css";

   10	const AdminOverviewPage = () => {
   11	  const overview = useQuery({
   12	    queryKey: ["admin", "overview"],
   13	    queryFn: () => getAdminOverview(),
   14	    retry: false,
   15	  });
   16	  const payments = useQuery({
   17	    queryKey: ["admin", "payments"],
   18	    queryFn: () => getAdminPayments(),
   19	    retry: false,
   20	  });
   21	
   22	  const data = overview.data;
   23	
   24	  if (overview.isFetching && !data) {
   25	    return (
   26	      <div className={styles.page}>
   27	        <Skeleton className={styles.skeletonTitle} />
   28	        <Skeleton className={styles.skeletonBlock} />
   29	      </div>
   30	    );
   31	  }
   32	
   33	  if (overview.error || !data) {
   34	    return (
   35	      <div className={styles.page}>
   36	        <h1 className={styles.title}>Overview</h1>
   37	        <p className={styles.errorText}>
   38	          {overview.error instanceof Error
   39	            ? overview.error.message
   40	            : "Could not load platform figures."}
   41	        </p>
   42	      </div>
   43	    );
   44	  }
   45	
   46	  const groups = [
   47	    {
   48	      heading: "Shops",
   49	      stats: [
   50	        { label: "Businesses", value: String(data.businessCount) },
   51	        { label: "Published", value: String(data.publishedCount) },
   52	        { label: "Suspended", value: String(data.suspendedCount) },
   53	        { label: "Owners", value: String(data.ownerCount) },
   54	      ],
   55	    },
   56	    {
   57	      heading: "Subscriptions",
   58	      stats: [
   59	        { label: "Premium active", value: String(data.premiumActiveCount) },
   60	        { label: "On trial", value: String(data.trialCount) },
   61	        { label: "Lapsed", value: String(data.lapsedCount) },
   62	        {
   63	          label: "Revenue collected",
   64	          value: formatMoney(data.subscriptionRevenue, data.currency),
   65	        },
   66	      ],
   67	    },
   68	    {
   69	      heading: "Activity",
   70	      stats: [
   71	        { label: "Products listed", value: String(data.productCount) },
   72	        { label: "Orders placed", value: String(data.orderCount) },
   73	        {
   74	          label: "Order value",
   75	          value: formatMoney(data.orderValue, data.currency),
   76	        },
   77	      ],
   78	    },
   79	  ];
   80	
   81	  return (
   82	    <div className={styles.page}>
   83	      <Helmet>
   84	        <title>Admin — Oniduka</title>
   85	        <meta name="robots" content="noindex" />
   86	      </Helmet>
   87	
   88	      <h1 className={styles.title}>Platform overview</h1>
   89	
   90	      {groups.map((group) => (
   91	        <section key={group.heading} className={styles.group}>
   92	          <h2 className={styles.groupHeading}>{group.heading}</h2>
   93	          <div className={styles.stats}>
   94	            {group.stats.map((stat) => (
   95	              <div key={stat.label} className={styles.stat}>
   96	                <span className={styles.statValue}>{stat.value}</span>
   97	                <span className={styles.statLabel}>{stat.label}</span>
   98	              </div>
   99	            ))}
  100	          </div>
  101	        </section>
  102	      ))}
  103	
  104	      <section className={styles.group}>
  105	        <h2 className={styles.groupHeading}>Recent payments</h2>
  106	        {payments.isFetching && !payments.data ? (
  107	          <Skeleton className={styles.skeletonBlock} />
  108	        ) : (payments.data?.payments.length ?? 0) === 0 ? (
  109	          <p className={styles.muted}>No subscription payments yet.</p>
  110	        ) : (
  111	          <ul className={styles.list}>
  112	            {payments.data?.payments.map((payment) => (
  113	              <li key={payment.id} className={styles.row}>
  114	                <div className={styles.rowText}>
  115	                  <span className={styles.rowName}>{payment.businessName}</span>
  116	                  <span className={styles.rowMeta}>{payment.txRef}</span>
  117	                </div>
  118	                <span className={styles.amount}>
  119	                  {formatMoney(payment.amount, payment.currency)}
  120	                </span>
  121	                <Badge
  122	                  variant={
  123	                    payment.status === "successful"
  124	                      ? "success"
  125	                      : payment.status === "failed"
  126	                        ? "destructive"
  127	                        : "warning"
  128	                  }
  129	                >
  130	                  {payment.status}
  131	                </Badge>
  132	                <span className={styles.date}>
  133	                  {new Date(payment.createdAt).toLocaleDateString()}
  134	                </span>
  135	              </li>
  136	            ))}
  137	          </ul>
  138	        )}
  139	      </section>
  140	    </div>
  141	  );
  142	};
  143	
  144	export default AdminOverviewPage;
