import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { Copy, ExternalLink, Eye, Plus, Trash2, X } from "lucide-react";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
   10	import { Textarea } from "../components/Textarea";
   11	import { formatMoney } from "../helpers/formatMoney";
   12	import { useProducts } from "../helpers/useProducts";
   13	import { useMyBusiness } from "../helpers/useMyBusiness";
   14	import { useShowcases } from "../helpers/useShowcases";
   15	import styles from "./dashboard.share.module.css";
   16	
   17	const DashboardSharePage = () => {
   18	  const { list, save, remove } = useShowcases();
   19	  const { data: productData } = useProducts();
   20	  const { data: businessData } = useMyBusiness();
   21	
   22	  const [open, setOpen] = useState(false);
   23	  const [editingId, setEditingId] = useState<string | null>(null);
   24	  const [title, setTitle] = useState("");
   25	  const [description, setDescription] = useState("");
   26	  const [selected, setSelected] = useState<string[]>([]);
   27	  const [confirming, setConfirming] = useState<string | null>(null);
   28	
   29	  const products = productData?.products ?? [];
   30	  const shopSlug = businessData?.business?.slug ?? "";
   31	  const showcases = useMemo(() => list.data?.showcases ?? [], [list.data]);
   32	
   33	  const reset = () => {
   34	    setOpen(false);
   35	    setEditingId(null);
   36	    setTitle("");
   37	    setDescription("");
   38	    setSelected([]);
   39	  };
   40	
   41	  const toggle = (id: string) =>
   42	    setSelected((current) =>
   43	      current.includes(id)
   44	        ? current.filter((item) => item !== id)
   45	        : [...current, id],
   46	    );
   47	
   48	  const submit = async () => {
   49	    try {
   50	      const result = await save.mutateAsync({
   51	        id: editingId,
   52	        title,
   53	        description,
   54	        productIds: selected,
   55	      });
   56	      toast.success(
   57	        editingId ? "Collection updated." : `Collection ready — /s/${result.showcase.code}`,
   58	      );
   59	      reset();
   60	    } catch (err) {
   61	      toast.error(
   62	        err instanceof Error ? err.message : "Could not save the collection.",
   63	      );
   64	    }
   65	  };
   66	
   67	  const copyLink = (path: string) => {
   68	    void navigator.clipboard
   69	      .writeText(`${window.location.origin}${path}`)
   70	      .then(() => toast.success("Link copied."))
   71	      .catch(() => toast.error("Could not copy the link."));
   72	  };
   73	
   74	  const deleteShowcase = async (id: string) => {
   75	    try {
   76	      await remove.mutateAsync({ id });
   77	      toast.success("Collection deleted.");
   78	      setConfirming(null);
   79	    } catch (err) {
   80	      toast.error(
   81	        err instanceof Error ? err.message : "Could not delete the collection.",
   82	      );
   83	    }
   84	  };
   85	
   86	  if (list.isFetching && !list.data) {
   87	    return (
   88	      <div className={styles.page}>
   89	        <Skeleton className={styles.skeletonTitle} />
   90	        <Skeleton className={styles.skeletonBlock} />
   91	      </div>
   92	    );
   93	  }
   94	
   95	  return (
   96	    <div className={styles.page}>
   97	      <Helmet>
   98	        <title>Share — Oniduka</title>
   99	      </Helmet>
  100	
  101	      <div className={styles.head}>
  102	        <div>
  103	          <h1 className={styles.title}>Share</h1>
  104	          <p className={styles.subtitle}>
  105	            Group products into one link for WhatsApp status, Instagram or
  106	            Facebook. Every product also has its own link below.
  107	          </p>
  108	        </div>
  109	        {!open && (
  110	          <Button onClick={() => setOpen(true)} disabled={products.length === 0}>
  111	            <Plus size={16} />
  112	            New collection
  113	          </Button>
  114	        )}
  115	      </div>
  116	
  117	      {open && (
  118	        <section className={styles.form}>
  119	          <div className={styles.formHead}>
  120	            <h2 className={styles.formTitle}>
  121	              {editingId ? "Edit collection" : "New collection"}
  122	            </h2>
  123	            <Button variant="ghost" size="icon-sm" onClick={reset} aria-label="Cancel">
  124	              <X size={16} />
  125	            </Button>
  126	          </div>
  127	
  128	          <label className={styles.field}>
  129	            <span className={styles.label}>Title</span>
  130	            <Input
  131	              value={title}
  132	              onChange={(event) => setTitle(event.target.value)}
  133	              placeholder="December deals"
  134	            />
  135	            <span className={styles.hint}>
  136	              This is the headline people see when the link is shared.
  137	            </span>
  138	          </label>
  139	
  140	          <label className={styles.field}>
  141	            <span className={styles.label}>Description (optional)</span>
  142	            <Textarea
  143	              value={description}
  144	              onChange={(event) => setDescription(event.target.value)}
  145	              rows={2}
  146	            />
  147	          </label>
  148	
  149	          <div className={styles.field}>
  150	            <span className={styles.label}>
  151	              Products ({selected.length} selected)
  152	            </span>
  153	            <div className={styles.picker}>
  154	              {products.map((product) => (
  155	                <label key={product.id} className={styles.pickerRow}>
  156	                  <Checkbox
  157	                    checked={selected.includes(product.id)}
  158	                    onChange={() => toggle(product.id)}
  159	                  />
  160	                  <span className={styles.pickerText}>
  161	                    <span className={styles.pickerName}>{product.name}</span>
  162	                    <span className={styles.pickerPrice}>
  163	                      {formatMoney(product.price, product.currency)}
  164	                    </span>
  165	                  </span>
  166	                </label>
  167	              ))}
  168	            </div>
  169	          </div>
  170	
  171	          <div className={styles.formActions}>
  172	            <Button
  173	              onClick={() => {
  174	                void submit();
  175	              }}
  176	              disabled={
  177	                save.isPending || title.trim().length === 0 || selected.length === 0
  178	              }
  179	            >
  180	              {save.isPending ? <Spinner size="sm" /> : null}
  181	              {editingId ? "Save changes" : "Create link"}
  182	            </Button>
  183	            <Button variant="ghost" onClick={reset}>
  184	              Cancel
  185	            </Button>
  186	          </div>
  187	        </section>
  188	      )}
  189	
  190	      <section>
  191	        <h2 className={styles.sectionHeading}>Collections</h2>
  192	        {showcases.length === 0 ? (
  193	          <div className={styles.empty}>
  194	            <p className={styles.emptyTitle}>No collections yet.</p>
  195	            <p className={styles.emptyBody}>
  196	              Pick a few products, give them a title, and you get one link worth
  197	              posting.
  198	            </p>
  199	          </div>
  200	        ) : (
  201	          <ul className={styles.list}>
  202	            {showcases.map((showcase) => (
  203	              <li key={showcase.id} className={styles.row}>
  204	                <div className={styles.rowText}>
  205	                  <span className={styles.rowName}>{showcase.title}</span>
  206	                  <span className={styles.rowMeta}>
  207	                    /s/{showcase.code} · {showcase.productIds.length} products
  208	                  </span>
  209	                </div>
  210	                <span className={styles.views}>
  211	                  <Eye size={13} />
  212	                  {showcase.viewCount}
  213	                </span>
  214	                <div className={styles.rowActions}>
  215	                  <Button
  216	                    variant="outline"
  217	                    size="sm"
  218	                    onClick={() => copyLink(`/s/${showcase.code}`)}
  219	                  >
  220	                    <Copy size={14} />
  221	                    Copy
  222	                  </Button>
  223	                  <Button asChild variant="ghost" size="icon-sm">
  224	                    <a
  225	                      href={`/s/${showcase.code}`}
  226	                      target="_blank"
  227	                      rel="noopener noreferrer"
  228	                      aria-label={`Open ${showcase.title}`}
  229	                    >
  230	                      <ExternalLink size={14} />
  231	                    </a>
  232	                  </Button>
  233	                  {confirming === showcase.id ? (
  234	                    <>
  235	                      <Button
  236	                        variant="destructive"
  237	                        size="sm"
  238	                        disabled={remove.isPending}
  239	                        onClick={() => {
  240	                          void deleteShowcase(showcase.id);
  241	                        }}
  242	                      >
  243	                        Delete
  244	                      </Button>
  245	                      <Button
  246	                        variant="ghost"
  247	                        size="sm"
  248	                        onClick={() => setConfirming(null)}
  249	                      >
  250	                        Cancel
  251	                      </Button>
  252	                    </>
  253	                  ) : (
  254	                    <Button
  255	                      variant="ghost"
  256	                      size="icon-sm"
  257	                      aria-label={`Delete ${showcase.title}`}
  258	                      onClick={() => setConfirming(showcase.id)}
  259	                    >
  260	                      <Trash2 size={14} />
  261	                    </Button>
  262	                  )}
  263	                </div>
  264	              </li>
  265	            ))}
  266	          </ul>
  267	        )}
  268	      </section>
  269	
  270	      <section>
  271	        <h2 className={styles.sectionHeading}>Product links</h2>
  272	        {products.length === 0 ? (
  273	          <p className={styles.emptyBody}>Add a product to get its link.</p>
  274	        ) : (
  275	          <ul className={styles.list}>
  276	            {products.map((product) => (
  277	              <li key={product.id} className={styles.row}>
  278	                <div className={styles.rowText}>
  279	                  <span className={styles.rowName}>{product.name}</span>
  280	                  <span className={styles.rowMeta}>
  281	                    /store/{shopSlug}/p/{product.slug}
  282	                  </span>
  283	                </div>
  284	                <div className={styles.rowActions}>
  285	                  <Button
  286	                    variant="outline"
  287	                    size="sm"
  288	                    disabled={!shopSlug}
  289	                    onClick={() =>
  290	                      copyLink(`/store/${shopSlug}/p/${product.slug}`)
  291	                    }
  292	                  >
  293	                    <Copy size={14} />
  294	                    Copy
  295	                  </Button>
  296	                  <Button asChild variant="ghost" size="icon-sm">
  297	                    <a
  298	                      href={`/store/${shopSlug}/p/${product.slug}`}
  299	                      target="_blank"
  300	                      rel="noopener noreferrer"
  301	                      aria-label={`Open ${product.name}`}
  302	                    >
  303	                      <ExternalLink size={14} />
  304	                    </a>
  305	                  </Button>
  306	                </div>
  307	              </li>
  308	            ))}
  309	          </ul>
  310	        )}
  311	      </section>
  312	    </div>
  313	  );
  314	};
  315	
  316	export default DashboardSharePage;
