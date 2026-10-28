import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Search } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
   10	import { getAdminBusinesses } from "../endpoints/admin/businesses_GET.schema";
   11	import { postAdminSetStatus } from "../endpoints/admin/setStatus_POST.schema";
   12	import { subscriptionPlan } from "../helpers/subscriptionPlan";
   13	import styles from "./admin.businesses.module.css";
   14	
   15	const AdminBusinessesPage = () => {
   16	  const queryClient = useQueryClient();
   17	  const { data, isFetching, error } = useQuery({
   18	    queryKey: ["admin", "businesses"],
   19	    queryFn: () => getAdminBusinesses(),
   20	    retry: false,
   21	  });
   22	
   23	  const setStatus = useMutation({
   24	    mutationFn: postAdminSetStatus,
   25	    onSuccess: () => {
   26	      void queryClient.invalidateQueries({ queryKey: ["admin"] });
   27	    },
   28	  });
   29	
   30	  const [search, setSearch] = useState("");
   31	  const [confirming, setConfirming] = useState<string | null>(null);
   32	
   33	  const businesses = useMemo(() => data?.businesses ?? [], [data]);
   34	
   35	  const visible = useMemo(() => {
   36	    const term = search.trim().toLowerCase();
   37	    if (!term) return businesses;
   38	    return businesses.filter(
   39	      (business) =>
   40	        business.name.toLowerCase().includes(term) ||
   41	        business.slug.toLowerCase().includes(term) ||
   42	        business.ownerEmail.toLowerCase().includes(term),
   43	    );
   44	  }, [businesses, search]);
   45	
   46	  const change = async (businessId: string, status: "published" | "suspended") => {
   47	    try {
   48	      await setStatus.mutateAsync({ businessId, status });
   49	      toast.success(status === "suspended" ? "Shop suspended." : "Shop restored.");
   50	      setConfirming(null);
   51	    } catch (err) {
   52	      toast.error(
   53	        err instanceof Error ? err.message : "Could not update the shop.",
   54	      );
   55	    }
   56	  };
   57	
   58	  if (isFetching && !data) {
   59	    return (
   60	      <div className={styles.page}>
   61	        <Skeleton className={styles.skeletonTitle} />
   62	        <Skeleton className={styles.skeletonBlock} />
   63	      </div>
   64	    );
   65	  }
   66	
   67	  if (error || !data) {
   68	    return (
   69	      <div className={styles.page}>
   70	        <h1 className={styles.title}>Businesses</h1>
   71	        <p className={styles.errorText}>
   72	          {error instanceof Error ? error.message : "Could not load businesses."}
   73	        </p>
   74	      </div>
   75	    );
   76	  }
   77	
   78	  return (
   79	    <div className={styles.page}>
   80	      <Helmet>
   81	        <title>Businesses — Oniduka Admin</title>
   82	        <meta name="robots" content="noindex" />
   83	      </Helmet>
   84	
   85	      <div className={styles.head}>
   86	        <h1 className={styles.title}>Businesses</h1>
   87	        <div className={styles.searchWrap}>
   88	          <Search size={16} className={styles.searchIcon} />
   89	          <Input
   90	            className={styles.searchInput}
   91	            value={search}
   92	            onChange={(event) => setSearch(event.target.value)}
   93	            placeholder="Search name, slug or owner email"
   94	            aria-label="Search businesses"
   95	          />
   96	        </div>
   97	      </div>
   98	
   99	      <ul className={styles.list}>
  100	        {visible.map((business) => {
  101	          const plan = subscriptionPlan.resolve(business);
  102	          const suspended = business.status === "suspended";
  103	          return (
  104	            <li key={business.id} className={styles.row}>
  105	              <div className={styles.rowMain}>
  106	                <div className={styles.rowText}>
  107	                  <span className={styles.rowName}>
  108	                    {business.name}
  109	                    {business.isDemo && (
  110	                      <Badge variant="secondary" className={styles.demoBadge}>
  111	                        demo
  112	                      </Badge>
  113	                    )}
  114	                  </span>
  115	                  <span className={styles.rowMeta}>
  116	                    /{business.slug} · {business.ownerEmail}
  117	                  </span>
  118	                  <span className={styles.rowMeta}>
  119	                    {business.productCount} products · {business.orderCount} orders
  120	                    · joined{" "}
  121	                    {new Date(business.createdAt).toLocaleDateString()}
  122	                  </span>
  123	                </div>
  124	
  125	                <div className={styles.badges}>
  126	                  <Badge
  127	                    variant={
  128	                      suspended
  129	                        ? "destructive"
  130	                        : business.status === "published"
  131	                          ? "success"
  132	                          : "secondary"
  133	                    }
  134	                  >
  135	                    {business.status}
  136	                  </Badge>
  137	                  <Badge variant={plan.isPremium ? "primary" : "secondary"}>
  138	                    {plan.source === "trial"
  139	                      ? `trial ${plan.trialDaysLeft}d`
  140	                      : plan.source === "paid"
  141	                        ? "premium"
  142	                        : plan.lapsed
  143	                          ? "lapsed"
  144	                          : "free"}
  145	                  </Badge>
  146	                </div>
  147	              </div>
  148	
  149	              <div className={styles.actions}>
  150	                <Button asChild variant="ghost" size="sm">
  151	                  <a
  152	                    href={`/store/${business.slug}`}
  153	                    target="_blank"
  154	                    rel="noopener noreferrer"
  155	                  >
  156	                    <ExternalLink size={14} />
  157	                    View
  158	                  </a>
  159	                </Button>
  160	
  161	                {confirming === business.id ? (
  162	                  <>
  163	                    <span className={styles.confirmText}>
  164	                      Hide this shop from the public?
  165	                    </span>
  166	                    <Button
  167	                      variant="destructive"
  168	                      size="sm"
  169	                      disabled={setStatus.isPending}
  170	                      onClick={() => {
  171	                        void change(business.id, "suspended");
  172	                      }}
  173	                    >
  174	                      Suspend
  175	                    </Button>
  176	                    <Button
  177	                      variant="ghost"
  178	                      size="sm"
  179	                      onClick={() => setConfirming(null)}
  180	                    >
  181	                      Cancel
  182	                    </Button>
  183	                  </>
  184	                ) : suspended ? (
  185	                  <Button
  186	                    variant="outline"
  187	                    size="sm"
  188	                    disabled={setStatus.isPending}
  189	                    onClick={() => {
  190	                      void change(business.id, "published");
  191	                    }}
  192	                  >
  193	                    Restore
  194	                  </Button>
  195	                ) : (
  196	                  <Button
  197	                    variant="outline"
  198	                    size="sm"
  199	                    onClick={() => setConfirming(business.id)}
  200	                  >
  201	                    Suspend
  202	                  </Button>
  203	                )}
  204	              </div>
  205	            </li>
  206	          );
  207	        })}
  208	      </ul>
  209	
  210	      {visible.length === 0 && (
  211	        <p className={styles.muted}>No businesses match that search.</p>
  212	      )}
  213	
  214	      <p className={styles.muted}>
  215	        Suspending hides the public page only. The owner keeps their dashboard
  216	        and every product, order and message.
  217	      </p>
  218	    </div>
  219	  );
  220	};
  221	
  222	export default AdminBusinessesPage;
