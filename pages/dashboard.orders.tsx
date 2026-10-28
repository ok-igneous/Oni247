import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import {
  Copy,
  MessageCircle,
  Minus,
  NotebookPen,
  Phone,
   10	  Plus,
   11	  Search,
   12	  Trash2,
   13	  X,
   14	} from "lucide-react";
   15	import { Badge } from "../components/Badge";
   16	import { Button } from "../components/Button";
   17	import { Input } from "../components/Input";
   18	import { Skeleton } from "../components/Skeleton";
   19	import { Spinner } from "../components/Spinner";
   20	import { Switch } from "../components/Switch";
   21	import { Textarea } from "../components/Textarea";
   22	import { formatMoney } from "../helpers/formatMoney";
   23	import { buildWhatsAppReplyUrl } from "../helpers/buildWhatsAppReplyUrl";
   24	import { useOrders } from "../helpers/useOrders";
   25	import { useOrderMutations } from "../helpers/useOrderMutations";
   26	import { useProducts } from "../helpers/useProducts";
   27	import { useMyBusiness } from "../helpers/useMyBusiness";
   28	import type { OrderStatus, ShippingStatus } from "../helpers/schema";
   29	import styles from "./dashboard.orders.module.css";
   30	
   31	type Filter = "all" | OrderStatus;
   32	
   33	const filters: { id: Filter; label: string }[] = [
   34	  { id: "all", label: "All" },
   35	  { id: "pending", label: "Pending" },
   36	  { id: "contacted", label: "Contacted" },
   37	  { id: "completed", label: "Completed" },
   38	  { id: "cancelled", label: "Cancelled" },
   39	];
   40	
   41	const nextSteps: { status: OrderStatus; label: string }[] = [
   42	  { status: "contacted", label: "Contacted" },
   43	  { status: "completed", label: "Completed" },
   44	  { status: "cancelled", label: "Cancelled" },
   45	];
   46	
   47	const shippingSteps: { id: ShippingStatus; label: string }[] = [
   48	  { id: "not_required", label: "Collection" },
   49	  { id: "preparing", label: "Preparing" },
   50	  { id: "shipped", label: "Shipped" },
   51	  { id: "out_for_delivery", label: "Out for delivery" },
   52	  { id: "delivered", label: "Delivered" },
   53	];
   54	
   55	const badgeVariant = (status: OrderStatus) => {
   56	  if (status === "completed") return "success" as const;
   57	  if (status === "cancelled") return "secondary" as const;
   58	  if (status === "contacted") return "primary" as const;
   59	  return "warning" as const;
   60	};
   61	
   62	const OrdersPage = () => {
   63	  const { data, isFetching, error } = useOrders();
   64	  const { data: productData } = useProducts();
   65	  const { data: businessData } = useMyBusiness();
   66	  const businessSlug = businessData?.business?.slug;
   67	  const { update, create, remove } = useOrderMutations();
   68	
   69	  const [filter, setFilter] = useState<Filter>("all");
   70	  const [search, setSearch] = useState("");
   71	  const [confirmingId, setConfirmingId] = useState<string | null>(null);
   72	  const [noteFor, setNoteFor] = useState<string | null>(null);
   73	  const [noteText, setNoteText] = useState("");
   74	
   75	  const [saleOpen, setSaleOpen] = useState(false);
   76	  const [sale, setSale] = useState({
   77	    customerName: "",
   78	    customerPhone: "",
   79	    deliveryAddress: "",
   80	    markCompleted: true,
   81	  });
   82	  const [saleItems, setSaleItems] = useState<Record<string, number>>({});
   83	
   84	  const orders = useMemo(() => data?.orders ?? [], [data]);
   85	  const products = productData?.products ?? [];
   86	
   87	  const counts = useMemo(() => {
   88	    const base: Record<Filter, number> = {
   89	      all: orders.length,
   90	      pending: 0,
   91	      contacted: 0,
   92	      completed: 0,
   93	      cancelled: 0,
   94	    };
   95	    for (const order of orders) base[order.status] += 1;
   96	    return base;
   97	  }, [orders]);
   98	
   99	  const totals = useMemo(() => {
  100	    let open = 0;
  101	    let earned = 0;
  102	    let currency = "NGN";
  103	    for (const order of orders) {
  104	      currency = order.currency;
  105	      if (order.status === "pending" || order.status === "contacted") {
  106	        open += order.totalAmount;
  107	      }
  108	      if (order.status === "completed") earned += order.totalAmount;
  109	    }
  110	    return { open, earned, currency };
  111	  }, [orders]);
  112	
  113	  const visible = useMemo(() => {
  114	    const term = search.trim().toLowerCase();
  115	    return orders.filter((order) => {
  116	      const matchesFilter = filter === "all" || order.status === filter;
  117	      const matchesTerm =
  118	        term.length === 0 ||
  119	        order.customerName.toLowerCase().includes(term) ||
  120	        order.trackingCode.toLowerCase().includes(term) ||
  121	        (order.customerPhone ?? "").toLowerCase().includes(term) ||
  122	        order.items.some((line) => line.name.toLowerCase().includes(term));
  123	      return matchesFilter && matchesTerm;
  124	    });
  125	  }, [orders, filter, search]);
  126	
  127	  const saleTotal = useMemo(
  128	    () =>
  129	      Object.entries(saleItems).reduce((sum, [id, quantity]) => {
  130	        const product = products.find((item) => item.id === id);
  131	        return sum + (product ? product.price * quantity : 0);
  132	      }, 0),
  133	    [saleItems, products],
  134	  );
  135	
  136	  const saleCurrency = products[0]?.currency ?? "NGN";
  137	
  138	  const bump = (id: string, delta: number) =>
  139	    setSaleItems((current) => {
  140	      const next = (current[id] ?? 0) + delta;
  141	      if (next <= 0) {
  142	        const { [id]: _removed, ...rest } = current;
  143	        return rest;
  144	      }
  145	      return { ...current, [id]: next };
  146	    });
  147	
  148	  const patchOrder = async (
  149	    id: string,
  150	    patch: { status?: OrderStatus; shippingStatus?: ShippingStatus; ownerNote?: string },
  151	  ) => {
  152	    try {
  153	      await update.mutateAsync({ id, ...patch });
  154	    } catch (err) {
  155	      toast.error(
  156	        err instanceof Error ? err.message : "Could not update the order.",
  157	      );
  158	    }
  159	  };
  160	
  161	  const recordSale = async () => {
  162	    const items = Object.entries(saleItems).map(([productId, quantity]) => ({
  163	      productId,
  164	      quantity,
  165	    }));
  166	    try {
  167	      const result = await create.mutateAsync({
  168	        customerName: sale.customerName,
  169	        customerPhone: sale.customerPhone,
  170	        deliveryAddress: sale.deliveryAddress,
  171	        markCompleted: sale.markCompleted,
  172	        items,
  173	      });
  174	      toast.success(`Sale recorded — reference ${result.trackingCode}.`);
  175	      setSaleOpen(false);
  176	      setSale({
  177	        customerName: "",
  178	        customerPhone: "",
  179	        deliveryAddress: "",
  180	        markCompleted: true,
  181	      });
  182	      setSaleItems({});
  183	    } catch (err) {
  184	      toast.error(
  185	        err instanceof Error ? err.message : "Could not record the sale.",
  186	      );
  187	    }
  188	  };
  189	
  190	  const deleteOrder = async (id: string) => {
  191	    try {
  192	      await remove.mutateAsync({ id });
  193	      toast.success("Order deleted.");
  194	      setConfirmingId(null);
  195	    } catch (err) {
  196	      toast.error(
  197	        err instanceof Error ? err.message : "Could not delete the order.",
  198	      );
  199	    }
  200	  };
  201	
  202	  const copyTracking = (code: string) => {
  203	    void navigator.clipboard
  204	      .writeText(`${window.location.origin}${businessSlug ? `/store/${businessSlug}/track/${code}` : `/track/${code}`}`)
  205	      .then(() => toast.success("Tracking link copied."))
  206	      .catch(() => toast.error("Could not copy the link."));
  207	  };
  208	
  209	  if (isFetching && !data) {
  210	    return (
  211	      <div className={styles.page}>
  212	        <Skeleton className={styles.skeletonTitle} />
  213	        <Skeleton className={styles.skeletonBlock} />
  214	      </div>
  215	    );
  216	  }
  217	
  218	  return (
  219	    <div className={styles.page}>
  220	      <Helmet>
  221	        <title>Orders — Oniduka</title>
  222	      </Helmet>
  223	
  224	      <div className={styles.head}>
  225	        <div>
  226	          <h1 className={styles.title}>Orders</h1>
  227	          <p className={styles.subtitle}>
  228	            Online orders arrive here when a customer sends their cart. You can
  229	            also record a sale made in the shop or over the phone.
  230	          </p>
  231	        </div>
  232	        {!saleOpen && (
  233	          <Button onClick={() => setSaleOpen(true)}>
  234	            <Plus size={16} />
  235	            Record a sale
  236	          </Button>
  237	        )}
  238	      </div>
  239	
  240	      {error && (
  241	        <p className={styles.errorText}>
  242	          {error instanceof Error ? error.message : "Could not load orders."}
  243	        </p>
  244	      )}
  245	
  246	      {saleOpen && (
  247	        <section className={styles.form}>
  248	          <div className={styles.formHead}>
  249	            <h2 className={styles.formTitle}>Record a sale</h2>
  250	            <Button
  251	              variant="ghost"
  252	              size="icon-sm"
  253	              onClick={() => setSaleOpen(false)}
  254	              aria-label="Cancel"
  255	            >
  256	              <X size={16} />
  257	            </Button>
  258	          </div>
  259	
  260	          {products.length === 0 ? (
  261	            <p className={styles.subtitle}>
  262	              Add a product first — a sale is built from your catalogue so the
  263	              prices stay consistent.
  264	            </p>
  265	          ) : (
  266	            <>
  267	              <div className={styles.saleFields}>
  268	                <Input
  269	                  value={sale.customerName}
  270	                  onChange={(event) =>
  271	                    setSale({ ...sale, customerName: event.target.value })
  272	                  }
  273	                  placeholder="Customer name"
  274	                  aria-label="Customer name"
  275	                />
  276	                <Input
  277	                  value={sale.customerPhone}
  278	                  onChange={(event) =>
  279	                    setSale({ ...sale, customerPhone: event.target.value })
  280	                  }
  281	                  placeholder="Phone (optional)"
  282	                  inputMode="tel"
  283	                  aria-label="Customer phone"
  284	                />
  285	                <Input
  286	                  value={sale.deliveryAddress}
  287	                  onChange={(event) =>
  288	                    setSale({ ...sale, deliveryAddress: event.target.value })
  289	                  }
  290	                  placeholder="Delivery address (optional)"
  291	                  aria-label="Delivery address"
  292	                />
  293	              </div>
  294	
  295	              <div className={styles.picker}>
  296	                {products.map((product) => (
  297	                  <div key={product.id} className={styles.pickerRow}>
  298	                    <div className={styles.pickerText}>
  299	                      <span className={styles.pickerName}>{product.name}</span>
  300	                      <span className={styles.pickerPrice}>
  301	                        {formatMoney(product.price, product.currency)}
  302	                      </span>
  303	                    </div>
  304	                    <div className={styles.stepper}>
  305	                      <Button
  306	                        variant="outline"
  307	                        size="icon-sm"
  308	                        disabled={!saleItems[product.id]}
  309	                        onClick={() => bump(product.id, -1)}
  310	                        aria-label={`Fewer ${product.name}`}
  311	                      >
  312	                        <Minus size={14} />
  313	                      </Button>
  314	                      <span className={styles.qty}>
  315	                        {saleItems[product.id] ?? 0}
  316	                      </span>
  317	                      <Button
  318	                        variant="outline"
  319	                        size="icon-sm"
  320	                        onClick={() => bump(product.id, 1)}
  321	                        aria-label={`More ${product.name}`}
  322	                      >
  323	                        <Plus size={14} />
  324	                      </Button>
  325	                    </div>
  326	                  </div>
  327	                ))}
  328	              </div>
  329	
  330	              <div className={styles.switchRow}>
  331	                <Switch
  332	                  id="markCompleted"
  333	                  checked={sale.markCompleted}
  334	                  onCheckedChange={(checked) =>
  335	                    setSale({ ...sale, markCompleted: checked })
  336	                  }
  337	                />
  338	                <label htmlFor="markCompleted" className={styles.switchLabel}>
  339	                  Already paid and collected
  340	                </label>
  341	              </div>
  342	
  343	              <div className={styles.formActions}>
  344	                <Button
  345	                  onClick={() => {
  346	                    void recordSale();
  347	                  }}
  348	                  disabled={
  349	                    create.isPending ||
  350	                    sale.customerName.trim().length === 0 ||
  351	                    Object.keys(saleItems).length === 0
  352	                  }
  353	                >
  354	                  {create.isPending ? <Spinner size="sm" /> : null}
  355	                  Record {formatMoney(saleTotal, saleCurrency)}
  356	                </Button>
  357	                <Button variant="ghost" onClick={() => setSaleOpen(false)}>
  358	                  Cancel
  359	                </Button>
  360	              </div>
  361	            </>
  362	          )}
  363	        </section>
  364	      )}
  365	
  366	      {orders.length > 0 && (
  367	        <section className={styles.summary}>
  368	          <div className={styles.summaryItem}>
  369	            <span className={styles.summaryValue}>{counts.pending}</span>
  370	            <span className={styles.summaryLabel}>Awaiting reply</span>
  371	          </div>
  372	          <div className={styles.summaryItem}>
  373	            <span className={styles.summaryValue}>
  374	              {formatMoney(totals.open, totals.currency)}
  375	            </span>
  376	            <span className={styles.summaryLabel}>Open order value</span>
  377	          </div>
  378	          <div className={styles.summaryItem}>
  379	            <span className={styles.summaryValue}>
  380	              {formatMoney(totals.earned, totals.currency)}
  381	            </span>
  382	            <span className={styles.summaryLabel}>Completed</span>
  383	          </div>
  384	        </section>
  385	      )}
  386	
  387	      {orders.length > 0 && (
  388	        <div className={styles.controls}>
  389	          <div className={styles.filters}>
  390	            {filters.map((item) => (
  391	              <button
  392	                key={item.id}
  393	                type="button"
  394	                className={`${styles.filter} ${filter === item.id ? styles.filterActive : ""}`}
  395	                onClick={() => setFilter(item.id)}
  396	              >
  397	                {item.label}
  398	                <span className={styles.filterCount}>{counts[item.id]}</span>
  399	              </button>
  400	            ))}
  401	          </div>
  402	          <div className={styles.searchWrap}>
  403	            <Search size={16} className={styles.searchIcon} />
  404	            <Input
  405	              className={styles.searchInput}
  406	              value={search}
  407	              onChange={(event) => setSearch(event.target.value)}
  408	              placeholder="Search name, code or item"
  409	              aria-label="Search orders"
  410	            />
  411	          </div>
  412	        </div>
  413	      )}
  414	
  415	      {orders.length === 0 ? (
  416	        <div className={styles.empty}>
  417	          <p className={styles.emptyTitle}>No orders yet.</p>
  418	          <p className={styles.emptyBody}>
  419	            Share your page link, or record your first in-shop sale above.
  420	          </p>
  421	        </div>
  422	      ) : visible.length === 0 ? (
  423	        <div className={styles.empty}>
  424	          <p className={styles.emptyTitle}>Nothing matches that.</p>
  425	          <p className={styles.emptyBody}>
  426	            Try another search term, or switch back to All.
  427	          </p>
  428	        </div>
  429	      ) : (
  430	        <ul className={styles.list}>
  431	          {visible.map((order) => (
  432	            <li key={order.id} className={styles.card}>
  433	              <div className={styles.cardHead}>
  434	                <div className={styles.cardWho}>
  435	                  <span className={styles.customer}>{order.customerName}</span>
  436	                  {order.customerPhone && (
  437	                    <div className={styles.contactLinks}>
  438	                      <a
  439	                        className={styles.contactLink}
  440	                        href={`tel:${order.customerPhone.replace(/\s/g, "")}`}
  441	                      >
  442	                        <Phone size={13} />
  443	                        {order.customerPhone}
  444	                      </a>
  445	                      <a
  446	                        className={styles.contactLink}
  447	                        href={buildWhatsAppReplyUrl({
  448	                          phone: order.customerPhone,
  449	                          message: `Hello ${order.customerName}, an update on your order ${order.trackingCode}.\nTrack it here: ${window.location.origin}${businessSlug ? `/store/${businessSlug}/track/${order.trackingCode}` : `/track/${order.trackingCode}`}\n\n`,
  450	                        })}
  451	                        target="_blank"
  452	                        rel="noopener noreferrer"
  453	                      >
  454	                        <MessageCircle size={13} />
  455	                        Reply
  456	                      </a>
  457	                    </div>
  458	                  )}
  459	                </div>
  460	                <div className={styles.headBadges}>
  461	                  {order.source === "direct" && (
  462	                    <Badge variant="secondary">In shop</Badge>
  463	                  )}
  464	                  <Badge variant={badgeVariant(order.status)}>
  465	                    {order.status}
  466	                  </Badge>
  467	                </div>
  468	              </div>
  469	
  470	              <div className={styles.trackingRow}>
  471	                <a
  472	                  className={styles.trackingCode}
  473	                  href={businessSlug ? `/store/${businessSlug}/track/${order.trackingCode}` : `/track/${order.trackingCode}`}
  474	                  target="_blank"
  475	                  rel="noopener noreferrer"
  476	                >
  477	                  {order.trackingCode}
  478	                </a>
  479	                <Button
  480	                  variant="ghost"
  481	                  size="sm"
  482	                  onClick={() => copyTracking(order.trackingCode)}
  483	                >
  484	                  <Copy size={14} />
  485	                  Copy tracking link
  486	                </Button>
  487	              </div>
  488	
  489	              <ul className={styles.lines}>
  490	                {order.items.map((line) => (
  491	                  <li key={line.productId} className={styles.line}>
  492	                    <span>
  493	                      {line.quantity} × {line.name}
  494	                    </span>
  495	                    <span className={styles.lineTotal}>
  496	                      {formatMoney(line.lineTotal, order.currency)}
  497	                    </span>
  498	                  </li>
  499	                ))}
  500	              </ul>
  501	
  502	              <div className={styles.cardFoot}>
  503	                <span className={styles.total}>
  504	                  {formatMoney(order.totalAmount, order.currency)}
  505	                </span>
  506	                <span className={styles.date}>
  507	                  {new Date(order.createdAt).toLocaleString()}
  508	                </span>
  509	              </div>
  510	
  511	              {order.deliveryAddress && (
  512	                <p className={styles.address}>
  513	                  Deliver to {order.deliveryAddress}
  514	                </p>
  515	              )}
  516	
  517	              <div className={styles.shippingRow}>
  518	                <span className={styles.shippingLabel}>Shipping</span>
  519	                <div className={styles.shippingButtons}>
  520	                  {shippingSteps.map((step) => (
  521	                    <button
  522	                      key={step.id}
  523	                      type="button"
  524	                      className={`${styles.ship} ${order.shippingStatus === step.id ? styles.shipActive : ""}`}
  525	                      disabled={update.isPending}
  526	                      onClick={() => {
  527	                        void patchOrder(order.id, { shippingStatus: step.id });
  528	                      }}
  529	                    >
  530	                      {step.label}
  531	                    </button>
  532	                  ))}
  533	                </div>
  534	              </div>
  535	
  536	              {noteFor === order.id ? (
  537	                <div className={styles.noteBox}>
  538	                  <Textarea
  539	                    value={noteText}
  540	                    onChange={(event) => setNoteText(event.target.value)}
  541	                    rows={2}
  542	                    placeholder="Shown to the customer on their tracking page."
  543	                    aria-label="Note for the customer"
  544	                  />
  545	                  <div className={styles.formActions}>
  546	                    <Button
  547	                      size="sm"
  548	                      disabled={update.isPending}
  549	                      onClick={() => {
  550	                        void patchOrder(order.id, { ownerNote: noteText }).then(
  551	                          () => setNoteFor(null),
  552	                        );
  553	                      }}
  554	                    >
  555	                      Save note
  556	                    </Button>
  557	                    <Button
  558	                      variant="ghost"
  559	                      size="sm"
  560	                      onClick={() => setNoteFor(null)}
  561	                    >
  562	                      Cancel
  563	                    </Button>
  564	                  </div>
  565	                </div>
  566	              ) : (
  567	                order.ownerNote && (
  568	                  <p className={styles.savedNote}>{order.ownerNote}</p>
  569	                )
  570	              )}
  571	
  572	              {confirmingId === order.id ? (
  573	                <div className={styles.statusRow}>
  574	                  <span className={styles.confirmText}>
  575	                    Delete this order permanently?
  576	                  </span>
  577	                  <Button
  578	                    variant="destructive"
  579	                    size="sm"
  580	                    disabled={remove.isPending}
  581	                    onClick={() => {
  582	                      void deleteOrder(order.id);
  583	                    }}
  584	                  >
  585	                    Yes, delete
  586	                  </Button>
  587	                  <Button
  588	                    variant="ghost"
  589	                    size="sm"
  590	                    onClick={() => setConfirmingId(null)}
  591	                  >
  592	                    Cancel
  593	                  </Button>
  594	                </div>
  595	              ) : (
  596	                <div className={styles.statusRow}>
  597	                  {nextSteps
  598	                    .filter((step) => step.status !== order.status)
  599	                    .map((step) => (
  600	                      <Button
  601	                        key={step.status}
  602	                        variant="outline"
  603	                        size="sm"
  604	                        disabled={update.isPending}
  605	                        onClick={() => {
  606	                          void patchOrder(order.id, { status: step.status });
  607	                        }}
  608	                      >
  609	                        {step.label}
  610	                      </Button>
  611	                    ))}
  612	                  <Button
  613	                    variant="ghost"
  614	                    size="sm"
  615	                    onClick={() => {
  616	                      setNoteFor(order.id);
  617	                      setNoteText(order.ownerNote ?? "");
  618	                    }}
  619	                  >
  620	                    <NotebookPen size={15} />
  621	                    Note
  622	                  </Button>
  623	                  <Button
  624	                    variant="ghost"
  625	                    size="icon-sm"
  626	                    aria-label="Delete order"
  627	                    className={styles.deleteButton}
  628	                    onClick={() => setConfirmingId(order.id)}
  629	                  >
  630	                    <Trash2 size={15} />
  631	                  </Button>
  632	                </div>
  633	              )}
  634	            </li>
  635	          ))}
  636	        </ul>
  637	      )}
  638	    </div>
  639	  );
  640	};
  641	
  642	export default OrdersPage;
