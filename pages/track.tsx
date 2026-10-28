import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { ChevronRight, PackageSearch, X } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { formatMoney } from "../helpers/formatMoney";
import { useMyOrders } from "../helpers/useMyOrders";
import styles from "./track.module.css";
   10	
   11	const TrackLookupPage = () => {
   12	  const navigate = useNavigate();
   13	  const [code, setCode] = useState("");
   14	  const { orders, forget } = useMyOrders();
   15	
   16	  const go = () => {
   17	    const clean = code.trim().toUpperCase();
   18	    if (clean.length >= 6) navigate(`/track/${clean}`);
   19	  };
   20	
   21	  return (
   22	    <div className={styles.site}>
   23	      <Helmet>
   24	        <title>Track an order — Oniduka</title>
   25	        <meta
   26	          name="description"
   27	          content="Check the status of an order using your reference code."
   28	        />
   29	      </Helmet>
   30	
   31	      <header className={styles.header}>
   32	        <Link to="/" className={styles.brand}><span className={styles.brandMark}>O</span><span><strong>Oniduka</strong><small>Business storefronts</small></span></Link>
   33	        <nav><Link to="/">Home</Link></nav>
   34	      </header>
   35	      <main className={styles.content}>
   36	      <div className={styles.card}>
   37	        <PackageSearch size={28} className={styles.icon} />
   38	        <h1 className={styles.title}>Track your order</h1>
   39	        <p className={styles.body}>
   40	          Enter the reference code the shop sent you. No account needed.
   41	        </p>
   42	        <Input
   43	          value={code}
   44	          onChange={(event) => setCode(event.target.value.toUpperCase())}
   45	          onKeyDown={(event) => {
   46	            if (event.key === "Enter") go();
   47	          }}
   48	          placeholder="e.g. K7M2QX4P"
   49	          aria-label="Order reference code"
   50	          className={styles.input}
   51	        />
   52	        <Button onClick={go} disabled={code.trim().length < 6} size="lg">
   53	          Check order
   54	        </Button>
   55	      </div>
   56	
   57	      {orders.length > 0 && (
   58	        <div className={styles.card}>
   59	          <h2 className={styles.subtitle}>Your orders on this device</h2>
   60	          <p className={styles.body}>
   61	            Saved in this browser only. Clearing your browsing data removes
   62	            them, so keep your codes somewhere safe too.
   63	          </p>
   64	          <ul className={styles.list}>
   65	            {orders.map((order) => (
   66	              <li key={order.code} className={styles.row}>
   67	                <Link to={`/track/${order.code}`} className={styles.rowLink}>
   68	                  <span className={styles.rowText}>
   69	                    <span className={styles.rowShop}>{order.businessName}</span>
   70	                    <span className={styles.rowMeta}>
   71	                      {order.code} ·{" "}
   72	                      {formatMoney(order.total, order.currency)} ·{" "}
   73	                      {new Date(order.placedAt).toLocaleDateString()}
   74	                    </span>
   75	                  </span>
   76	                  <ChevronRight size={16} className={styles.chevron} />
   77	                </Link>
   78	                <Button
   79	                  variant="ghost"
   80	                  size="icon-sm"
   81	                  aria-label={`Remove ${order.code} from this list`}
   82	                  onClick={() => forget(order.code)}
   83	                >
   84	                  <X size={14} />
   85	                </Button>
   86	              </li>
   87	            ))}
   88	          </ul>
   89	        </div>
   90	      )}
   91	      </main>
   92	      <footer className={styles.footer}>Secure order tracking · Powered by Oniduka</footer>
   93	    </div>
   94	  );
   95	};
   96	
   97	export default TrackLookupPage;
