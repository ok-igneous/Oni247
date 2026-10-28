import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
   10	import { Skeleton } from "../components/Skeleton";
   11	import { Spinner } from "../components/Spinner";
   12	import { formatMoney } from "../helpers/formatMoney";
   13	import {
   14	  SUBSCRIPTION_QUERY_KEY,
   15	  useSubscriptionStatus,
   16	} from "../helpers/useSubscriptionStatus";
   17	import { postSubscriptionCheckout } from "../endpoints/subscription/checkout_POST.schema";
   18	import { postVerifySubscription } from "../endpoints/subscription/verify_POST.schema";
   19	import styles from "./dashboard.plan.module.css";
   20	
   21	const freeFeatures = ["Up to 5 products", "One-page business presence", "WhatsApp ordering"];
   22	const onePageFeatures = [
   23	  "One-page business website",
   24	  "Products and WhatsApp ordering",
   25	  "WhatsApp ordering",
   26	  "Business profile and branding",
   27	];
   28	const premiumFeatures = [
   29	  "Multi-page website",
   30	  "Unlimited products",
   31	  "Gallery, Blog and Services",
   32	  "Homepage slider and video integration",
   33	  "Social sharing and customer order features",
   34	];
   35	
   36	const PlanPage = () => {
   37	  const { data, isFetching, error } = useSubscriptionStatus();
   38	  const queryClient = useQueryClient();
   39	  const [searchParams, setSearchParams] = useSearchParams();
   40	  const [starting, setStarting] = useState(false);
   41	  const [verifying, setVerifying] = useState(false);
   42	  const [durationUnit, setDurationUnit] = useState<"months" | "years">("months");
   43	  const [duration, setDuration] = useState(1);
   44	  const handledRef = useRef(false);
   45	
   46	  // Flutterwave sends the customer back here with the result in the query
   47	  // string. It is only a hint — the server re-checks with Flutterwave.
   48	  useEffect(() => {
   49	    if (handledRef.current) return;
   50	    const txRef = searchParams.get("tx_ref");
   51	    const transactionId = searchParams.get("transaction_id");
   52	    const status = searchParams.get("status");
   53	    if (!txRef) return;
   54	
   55	    handledRef.current = true;
   56	
   57	    if (!transactionId || status === "cancelled") {
   58	      toast.error("Payment was not completed.");
   59	      setSearchParams({}, { replace: true });
   60	      return;
   61	    }
   62	
   63	    setVerifying(true);
   64	    postVerifySubscription({ txRef, transactionId })
   65	      .then((result) => {
   66	        if (result.activated) toast.success(result.message);
   67	        else toast.message(result.message);
   68	        void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
   69	        void queryClient.invalidateQueries({ queryKey: ["business", "me"] });
   70	      })
   71	      .catch((err: unknown) => {
   72	        toast.error(
   73	          err instanceof Error ? err.message : "Could not confirm the payment.",
   74	        );
   75	      })
   76	      .finally(() => {
   77	        setVerifying(false);
   78	        setSearchParams({}, { replace: true });
   79	      });
   80	  }, [searchParams, setSearchParams, queryClient]);
   81	
   82	  const startCheckout = async () => {
   83	    const durationMonths = durationUnit === "years" ? duration * 12 : duration;
   84	    const selectedPlan = selectedPlanRef.current;
   85	    setStarting(true);
   86	    try {
   87	      const { paymentLink } = await postSubscriptionCheckout({
   88	        websitePlan: selectedPlan,
   89	        durationMonths,
   90	      });
   91	      // Flutterwave is an external checkout URL; router navigation treats it
   92	      // as an in-app route and can leave the customer on the plan page.
   93	      window.location.assign(paymentLink);
   94	    } catch (err) {
   95	      toast.error(
   96	        err instanceof Error ? err.message : "Could not start the payment.",
   97	      );
   98	      setStarting(false);
   99	    }
  100	  };
  101	
  102	  const selectedPlanRef = useRef<"one_page" | "premium_plus">("premium_plus");
  103	
  104	  if (isFetching && !data) {
  105	    return (
  106	      <div className={styles.page}>
  107	        <Skeleton className={styles.skeletonTitle} />
  108	        <Skeleton className={styles.skeletonBlock} />
  109	      </div>
  110	    );
  111	  }
  112	
  113	  if (error || !data) {
  114	    return (
  115	      <div className={styles.page}>
  116	        <h1 className={styles.title}>Plan</h1>
  117	        <p className={styles.errorText}>
  118	          {error instanceof Error
  119	            ? error.message
  120	            : "Could not load your plan."}
  121	        </p>
  122	      </div>
  123	    );
  124	  }
  125	
  126	  const durationMonths = durationUnit === "years" ? duration * 12 : duration;
  127	  const onePagePrice = 1500 * durationMonths;
  128	  const premiumPlusPrice = 3000 * durationMonths;
  129	  const promoMultiplier = data.registrationPromoAvailable ? 0.5 : 1;
  130	
  131	  return (
  132	    <div className={styles.page}>
  133	      <Helmet>
  134	        <title>Plan — Oniduka</title>
  135	      </Helmet>
  136	
  137	      <div className={styles.head}>
  138	        <h1 className={styles.title}>Plan</h1>
  139	        <Badge variant={data.isPremium ? "success" : "secondary"}>
  140	          {data.source === "trial"
  141	            ? "Premium Plus Trial"
  142	            : data.isPremium
  143	              ? data.websitePlan === "premium_plus" ? "Premium Plus" : "One-Page Paid"
  144	              : "Free"}
  145	        </Badge>
  146	      </div>
  147	
  148	      {data.source === "trial" && (
  149	        <p className={styles.notice}>
  150	          Your one-time Premium Plus trial has {data.trialDaysLeft}{" "}
  151	          {data.trialDaysLeft === 1 ? "day" : "days"} left. When it expires,
  152	          your account returns to the Free plan. Your existing content stays saved.
  153	        </p>
  154	      )}
  155	
  156	      {data.lapsed && (
  157	        <p className={styles.notice}>
  158	          Your subscription has expired. Your products are all still here —
  159	          renew to list new ones again.
  160	        </p>
  161	      )}
  162	
  163	      {data.productLimit !== null && (
  164	        <p className={styles.usage}>
  165	          Using {data.productCount} of {data.productLimit} products.
  166	        </p>
  167	      )}
  168	
  169	      {data.source === "paid" && data.renewsAt && (
  170	        <p className={styles.usage}>
  171	          {data.websitePlan === "premium_plus" ? "Premium Plus" : "One-Page Website"} runs until {new Date(data.renewsAt).toLocaleDateString()}.
  172	        </p>
  173	      )}
  174	
  175	      <div className={styles.plans}>
  176	        <section className={styles.plan}>
  177	          <h2 className={styles.planName}>Free</h2>
  178	          <div className={styles.priceRow}>
  179	            <span className={styles.planPrice}>₦0</span>
  180	            <span className={styles.period}>always available</span>
  181	          </div>
  182	          <span className={styles.launchNote}>Your account returns to Free when a trial or paid plan expires.</span>
  183	          <ul className={styles.features}>
  184	            {freeFeatures.map((feature) => (
  185	              <li key={feature} className={styles.feature}>
  186	                <Check size={15} className={styles.featureIcon} />
  187	                {feature}
  188	              </li>
  189	            ))}
  190	          </ul>
  191	          {data.premiumTrialUsed && <span className={styles.launchNote}>{data.source === "trial" ? "Your one-time trial is active and cannot be restarted." : "Your one-time 7-day Premium Plus trial has already been used."}</span>}
  192	        </section>
  193	
  194	        <section className={styles.plan}>
  195	          <h2 className={styles.planName}>One-Page Website</h2>
  196	          <div className={styles.priceRow}>
  197	            <span className={styles.planPrice}>{formatMoney(onePagePrice * promoMultiplier, "NGN")}</span>
  198	            <span className={styles.period}>for {duration} {durationUnit}</span>
  199	          </div>
  200	          <span className={styles.launchNote}>₦1,500/month</span>
  201	          <ul className={styles.features}>
  202	            {onePageFeatures.map((feature) => (
  203	              <li key={feature} className={styles.feature}>
  204	                <Check size={15} className={styles.featureIcon} />
  205	                {feature}
  206	              </li>
  207	            ))}
  208	          </ul>
  209	          <Button
  210	            size="lg"
  211	            className={styles.upgradeButton}
  212	            disabled={starting || verifying || !data.paymentsConfigured}
  213	            onClick={() => {
  214	              selectedPlanRef.current = "one_page";
  215	              void startCheckout();
  216	            }}
  217	          >
  218	            {starting && selectedPlanRef.current === "one_page" ? <Spinner size="sm" /> : null}
  219	            Get One-Page Website
  220	          </Button>
  221	        </section>
  222	
  223	        <section className={`${styles.plan} ${styles.planHighlight}`}>
  224	          <h2 className={styles.planName}>Premium Plus</h2>
  225	          <div className={styles.priceRow}>
  226	            <span className={styles.planPrice}>{formatMoney(premiumPlusPrice * promoMultiplier, "NGN")}</span>
  227	            <span className={styles.period}>for {duration} {durationUnit}</span>
  228	          </div>
  229	          <span className={styles.launchNote}>₦3,000/month · multi-page website</span>
  230	          <ul className={styles.features}>
  231	            {premiumFeatures.map((feature) => (
  232	              <li key={feature} className={styles.feature}>
  233	                <Check size={15} className={styles.featureIcon} />
  234	                {feature}
  235	              </li>
  236	            ))}
  237	          </ul>
  238	
  239	          <Button
  240	            size="lg"
  241	            className={styles.upgradeButton}
  242	            disabled={starting || verifying || !data.paymentsConfigured}
  243	            onClick={() => {
  244	              selectedPlanRef.current = "premium_plus";
  245	              void startCheckout();
  246	            }}
  247	          >
  248	            {starting && selectedPlanRef.current === "premium_plus" ? <Spinner size="sm" /> : null}
  249	            {verifying
  250	              ? "Confirming payment"
  251	              : "Get Premium Plus"}
  252	          </Button>
  253	
  254	          {!data.paymentsConfigured && (
  255	            <span className={styles.launchNote}>
  256	              Payments are not connected yet.
  257	            </span>
  258	          )}
  259	
  260	          <span className={styles.launchNote}>
  261	            Paying early adds the selected time to your existing subscription.
  262	          </span>
  263	        </section>
  264	      </div>
  265	
  266	      <section className={styles.durationBox}>
  267	        <div>
  268	          <strong>Choose how long you want</strong>
  269	          <p className={styles.launchNote}>Select months or years. Maximum 24 months.</p>
  270	        </div>
  271	        <div className={styles.durationControls}>
  272	          <Select value={String(duration)} onValueChange={(value) => setDuration(Number(value))}>
  273	            <SelectTrigger><SelectValue /></SelectTrigger>
  274	            <SelectContent>
  275	              {Array.from({ length: durationUnit === "years" ? 2 : 24 }, (_, i) => i + 1).map((value) => (
  276	                <SelectItem key={value} value={String(value)}>{value}</SelectItem>
  277	              ))}
  278	            </SelectContent>
  279	          </Select>
  280	          <Select value={durationUnit} onValueChange={(value) => { const next = value as "months" | "years"; setDurationUnit(next); setDuration(1); }}>
  281	            <SelectTrigger><SelectValue /></SelectTrigger>
  282	            <SelectContent>
  283	              <SelectItem value="months">Months</SelectItem>
  284	              <SelectItem value="years">Years</SelectItem>
  285	            </SelectContent>
  286	          </Select>
  287	        </div>
  288	        {data.registrationPromoAvailable && (
  289	          <p className={styles.promoNote}>Registration promo: 50% off your first paid subscription. No ₦1,000 fixed promo price.</p>
  290	        )}
  291	      </section>
  292	    </div>
  293	  );
  294	};
  295	
  296	export default PlanPage;
