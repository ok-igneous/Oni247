import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { useDashboardOverview } from "../helpers/useDashboardOverview";
import styles from "./dashboard.module.css";
   10	
   11	const DashboardPage = () => {
   12	  const { data, isFetching, error } = useDashboardOverview();
   13	  const [copied, setCopied] = useState(false);
   14	
   15	  const copyLink = async (url: string) => {
   16	    try {
   17	      await navigator.clipboard.writeText(url);
   18	      setCopied(true);
   19	      window.setTimeout(() => setCopied(false), 2000);
   20	    } catch {
   21	      setCopied(false);
   22	    }
   23	  };
   24	
   25	  if (isFetching && !data) {
   26	    return (
   27	      <div className={styles.page}>
   28	        <Skeleton className={styles.skeletonTitle} />
   29	        <Skeleton className={styles.skeletonBlock} />
   30	      </div>
   31	    );
   32	  }
   33	
   34	  if (error) {
   35	    return (
   36	      <div className={styles.page}>
   37	        <h1 className={styles.title}>Overview</h1>
   38	        <p className={styles.errorText}>
   39	          Could not load your dashboard. Refresh the page and try again.
   40	        </p>
   41	      </div>
   42	    );
   43	  }
   44	
   45	  if (!data || !data.hasBusiness) {
   46	    return (
   47	      <div className={styles.page}>
   48	        <Helmet>
   49	          <title>Overview — Oniduka</title>
   50	        </Helmet>
   51	        <h1 className={styles.title}>Set up your business</h1>
   52	        <div className={styles.emptyState}>
   53	          <p className={styles.emptyBody}>
   54	            You have not created your business page yet. Add your business name,
   55	            WhatsApp number and contact details, and your page address is ready
   56	            to share.
   57	          </p>
   58	          <Button asChild>
   59	            <Link to="/dashboard/business">Create business page</Link>
   60	          </Button>
   61	        </div>
   62	      </div>
   63	    );
   64	  }
   65	
   66	  const pageUrl = `${window.location.origin}/store/${data.slug}`;
   67	  const isPublished = data.status === "published";
   68	
   69	  return (
   70	    <div className={styles.page}>
   71	      <Helmet>
   72	        <title>Overview — Oniduka</title>
   73	      </Helmet>
   74	
   75	      <div className={styles.head}>
   76	        <h1 className={styles.title}>{data.businessName}</h1>
   77	        <Badge variant={isPublished ? "success" : "secondary"}>
   78	          {isPublished ? "Published" : "Draft"}
   79	        </Badge>
   80	      </div>
   81	
   82	      {!isPublished && (
   83	        <p className={styles.notice}>
   84	          Your page is not public yet. Set it to published under Business when
   85	          you are ready to share the link.
   86	        </p>
   87	      )}
   88	
   89	      <section className={styles.linkRow}>
   90	        <span className={styles.linkLabel}>Your page address</span>
   91	        <code className={styles.link}>{pageUrl}</code>
   92	        <div className={styles.linkActions}>
   93	          <Button
   94	            variant="outline"
   95	            size="sm"
   96	            onClick={() => {
   97	              void copyLink(pageUrl);
   98	            }}
   99	          >
  100	            {copied ? <Check size={15} /> : <Copy size={15} />}
  101	            {copied ? "Copied" : "Copy"}
  102	          </Button>
  103	          <Button asChild variant="ghost" size="sm">
  104	            <a href={pageUrl} target="_blank" rel="noopener noreferrer">
  105	              <ExternalLink size={15} />
  106	              Open
  107	            </a>
  108	          </Button>
  109	        </div>
  110	      </section>
  111	
  112	      <section className={styles.stats}>
  113	        <Link to="/dashboard/products" className={styles.stat}>
  114	          <span className={styles.statValue}>{data.productCount}</span>
  115	          <span className={styles.statLabel}>Products</span>
  116	        </Link>
  117	        <Link to="/dashboard/categories" className={styles.stat}>
  118	          <span className={styles.statValue}>{data.categoryCount}</span>
  119	          <span className={styles.statLabel}>Categories</span>
  120	        </Link>
  121	        <Link to="/dashboard/enquiries" className={styles.stat}>
  122	          <span className={styles.statValue}>{data.newEnquiryCount}</span>
  123	          <span className={styles.statLabel}>New enquiries</span>
  124	        </Link>
  125	        <Link to="/dashboard/orders" className={styles.stat}>
  126	          <span className={styles.statValue}>{data.pendingOrderCount}</span>
  127	          <span className={styles.statLabel}>Pending orders</span>
  128	        </Link>
  129	      </section>
  130	
  131	      <div className={styles.quickLinks}>
  132	        <Button asChild variant="outline">
  133	          <Link to="/dashboard/orders">Manage orders</Link>
  134	        </Button>
  135	        <Button asChild variant="outline">
  136	          <Link to="/dashboard/products">Manage products</Link>
  137	        </Button>
  138	      </div>
  139	    </div>
  140	  );
  141	};
  142	
  143	export default DashboardPage;
