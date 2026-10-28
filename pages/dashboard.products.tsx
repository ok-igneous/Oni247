import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { ImageOff, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
   10	import { Spinner } from "../components/Spinner";
   11	import { Switch } from "../components/Switch";
   12	import { Textarea } from "../components/Textarea";
   13	import { formatMoney } from "../helpers/formatMoney";
   14	import { uploadImage } from "../helpers/uploadImage";
   15	import { useCategories } from "../helpers/useCategories";
   16	import { useProducts } from "../helpers/useProducts";
   17	import { useProductMutations } from "../helpers/useProductMutations";
   18	import { useSubscriptionStatus } from "../helpers/useSubscriptionStatus";
   19	import styles from "./dashboard.products.module.css";
   20	
   21	type Draft = {
   22	  id: string | null;
   23	  categoryId: string | null;
   24	  name: string;
   25	  description: string;
   26	  price: string;
   27	  costPrice: string;
   28	  imageUrl: string | null;
   29	  available: boolean;
   30	  featured: boolean;
   31	  sortOrder: number;
   32	  unit: string;
   33	  variants: { name: string; value: string; price: string }[];
   34	};
   35	
   36	const emptyDraft: Draft = {
   37	  id: null,
   38	  categoryId: null,
   39	  name: "",
   40	  description: "",
   41	  price: "",
   42	  costPrice: "",
   43	  imageUrl: null,
   44	  available: true,
   45	  featured: false,
   46	  sortOrder: 0,
   47	  unit: "",
   48	  variants: [],
   49	};
   50	
   51	const ProductsPage = () => {
   52	  const { data, isFetching, error } = useProducts();
   53	  const { data: categoryData } = useCategories();
   54	  const { data: plan } = useSubscriptionStatus();
   55	  const { save, remove } = useProductMutations();
   56	
   57	  const [draft, setDraft] = useState<Draft | null>(null);
   58	  const [confirmingId, setConfirmingId] = useState<string | null>(null);
   59	  const [uploading, setUploading] = useState(false);
   60	  const fileInputRef = useRef<HTMLInputElement>(null);
   61	
   62	  const products = data?.products ?? [];
   63	  const categories = categoryData?.categories ?? [];
   64	  const atLimit =
   65	    plan?.productLimit != null && products.length >= plan.productLimit;
   66	  const categoryName = (id: string | null) =>
   67	    categories.find((category) => category.id === id)?.name ?? null;
   68	
   69	  const handleFile = async (file: File | undefined) => {
   70	    if (!file || !draft) return;
   71	    setUploading(true);
   72	    try {
   73	      const url = await uploadImage(file, "product");
   74	      setDraft((current) => (current ? { ...current, imageUrl: url } : current));
   75	    } catch (err) {
   76	      toast.error(
   77	        err instanceof Error ? err.message : "The image failed to upload.",
   78	      );
   79	    } finally {
   80	      setUploading(false);
   81	      if (fileInputRef.current) fileInputRef.current.value = "";
   82	    }
   83	  };
   84	
   85	  const handleSave = async () => {
   86	    if (!draft) return;
   87	    const price = Number.parseFloat(draft.price);
   88	    if (Number.isNaN(price) || price < 0) {
   89	      toast.error("Enter a price, using numbers only.");
   90	      return;
   91	    }
   92	    try {
   93	      await save.mutateAsync({
   94	        id: draft.id,
   95	        categoryId: draft.categoryId,
   96	        name: draft.name,
   97	        description: draft.description,
   98	        price,
   99	        costPrice: draft.costPrice.trim() === "" ? null : Number.parseFloat(draft.costPrice),
  100	        imageUrl: draft.imageUrl,
  101	        available: draft.available,
  102	        featured: draft.featured,
  103	        sortOrder: draft.sortOrder,
  104	        unit: draft.unit.trim() || null,
  105	        variants: draft.variants
  106	          .filter((variant) => variant.name.trim() && variant.value.trim())
  107	          .map((variant) => ({
  108	            name: variant.name.trim(),
  109	            value: variant.value.trim(),
  110	            price: variant.price.trim() ? Number.parseFloat(variant.price) : null,
  111	          })),
  112	      });
  113	      toast.success(draft.id ? "Product updated." : "Product added.");
  114	      setDraft(null);
  115	    } catch (err) {
  116	      toast.error(
  117	        err instanceof Error ? err.message : "Could not save the product.",
  118	      );
  119	    }
  120	  };
  121	
  122	  const handleDelete = async (id: string) => {
  123	    try {
  124	      await remove.mutateAsync({ id });
  125	      toast.success("Product deleted.");
  126	      setConfirmingId(null);
  127	    } catch (err) {
  128	      toast.error(
  129	        err instanceof Error ? err.message : "Could not delete the product.",
  130	      );
  131	    }
  132	  };
  133	
  134	  if (isFetching && !data) {
  135	    return (
  136	      <div className={styles.page}>
  137	        <Skeleton className={styles.skeletonTitle} />
  138	        <Skeleton className={styles.skeletonBlock} />
  139	      </div>
  140	    );
  141	  }
  142	
  143	  return (
  144	    <div className={styles.page}>
  145	      <Helmet>
  146	        <title>Products — Oniduka</title>
  147	      </Helmet>
  148	
  149	      <div className={styles.head}>
  150	        <div>
  151	          <h1 className={styles.title}>Products &amp; services</h1>
  152	          <p className={styles.subtitle}>
  153	            Everything listed here appears on your public page. Unavailable
  154	            items stay visible but cannot be added to an order.
  155	          </p>
  156	        </div>
  157	        {!draft && (
  158	          <Button
  159	            disabled={atLimit}
  160	            onClick={() =>
  161	              setDraft({ ...emptyDraft, sortOrder: products.length })
  162	            }
  163	          >
  164	            <Plus size={16} />
  165	            Add product
  166	          </Button>
  167	        )}
  168	      </div>
  169	
  170	      {plan?.productLimit != null && (
  171	        <p className={styles.planNote}>
  172	          {atLimit
  173	            ? `You have used all ${plan.productLimit} products on the free plan. `
  174	            : `Using ${products.length} of ${plan.productLimit} products on the free plan. `}
  175	          <Link to="/dashboard/plan" className={styles.inlineLink}>
  176	            See Premium
  177	          </Link>
  178	        </p>
  179	      )}
  180	
  181	      {error && (
  182	        <p className={styles.errorText}>
  183	          {error instanceof Error ? error.message : "Could not load products."}
  184	        </p>
  185	      )}
  186	
  187	      {draft && (
  188	        <section className={styles.form}>
  189	          <div className={styles.formHead}>
  190	            <h2 className={styles.formTitle}>
  191	              {draft.id ? "Edit product" : "New product"}
  192	            </h2>
  193	            <Button
  194	              variant="ghost"
  195	              size="icon-sm"
  196	              onClick={() => setDraft(null)}
  197	              aria-label="Cancel"
  198	            >
  199	              <X size={16} />
  200	            </Button>
  201	          </div>
  202	
  203	          <div className={styles.imageField}>
  204	            <div className={styles.preview}>
  205	              {draft.imageUrl ? (
  206	                <img
  207	                  src={draft.imageUrl}
  208	                  alt=""
  209	                  className={styles.previewImage}
  210	                />
  211	              ) : (
  212	                <ImageOff size={20} className={styles.previewIcon} />
  213	              )}
  214	            </div>
  215	            <div className={styles.imageActions}>
  216	              <input
  217	                ref={fileInputRef}
  218	                type="file"
  219	                accept="image/png,image/jpeg,image/webp"
  220	                className={styles.fileInput}
  221	                onChange={(event) => {
  222	                  void handleFile(event.target.files?.[0]);
  223	                }}
  224	              />
  225	              <Button
  226	                variant="outline"
  227	                size="sm"
  228	                disabled={uploading}
  229	                onClick={() => fileInputRef.current?.click()}
  230	              >
  231	                {uploading ? <Spinner size="sm" /> : <Upload size={15} />}
  232	                {uploading ? "Uploading" : draft.imageUrl ? "Replace" : "Upload photo"}
  233	              </Button>
  234	              {draft.imageUrl && (
  235	                <Button
  236	                  variant="ghost"
  237	                  size="sm"
  238	                  onClick={() => setDraft({ ...draft, imageUrl: null })}
  239	                >
  240	                  Remove
  241	                </Button>
  242	              )}
  243	              <span className={styles.hint}>PNG, JPG or WebP, up to 3 MB.</span>
  244	            </div>
  245	          </div>
  246	
  247	          <label className={styles.field}>
  248	            <span className={styles.label}>Name</span>
  249	            <Input
  250	              value={draft.name}
  251	              onChange={(event) =>
  252	                setDraft({ ...draft, name: event.target.value })
  253	              }
  254	              placeholder="65W USB-C Fast Charger"
  255	            />
  256	          </label>
  257	
  258	          <label className={styles.field}>
  259	            <span className={styles.label}>Unit</span>
  260	            <Input
  261	              value={draft.unit}
  262	              onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
  263	              placeholder="piece, kg, litre, pack"
  264	            />
  265	            <span className={styles.hint}>Optional. Shown with the product price.</span>
  266	          </label>
  267	
  268	          <div className={styles.field}>
  269	            <span className={styles.label}>Varieties / options</span>
  270	            <span className={styles.hint}>Add options such as Color, Size, Material or any other choice customers need.</span>
  271	            <div className={styles.variantList}>
  272	              {draft.variants.map((variant, index) => (
  273	                <div key={index} className={styles.variantRow}>
  274	                  <Input
  275	                    value={variant.name}
  276	                    onChange={(event) => {
  277	                      const variants = [...draft.variants];
  278	                      variants[index] = { ...variant, name: event.target.value };
  279	                      setDraft({ ...draft, variants });
  280	                    }}
  281	                    placeholder="Color"
  282	                    aria-label="Option name"
  283	                  />
  284	                  <Input
  285	                    value={variant.value}
  286	                    onChange={(event) => {
  287	                      const variants = [...draft.variants];
  288	                      variants[index] = { ...variant, value: event.target.value };
  289	                      setDraft({ ...draft, variants });
  290	                    }}
  291	                    placeholder="Black"
  292	                    aria-label="Option value"
  293	                  />
  294	                  <Input
  295	                    value={variant.price}
  296	                    onChange={(event) => {
  297	                      const variants = [...draft.variants];
  298	                      variants[index] = { ...variant, price: event.target.value };
  299	                      setDraft({ ...draft, variants });
  300	                    }}
  301	                    placeholder="Price override"
  302	                    inputMode="decimal"
  303	                    aria-label="Variant price override"
  304	                  />
  305	                  <Button
  306	                    type="button"
  307	                    variant="ghost"
  308	                    size="icon-sm"
  309	                    aria-label="Remove option"
  310	                    onClick={() => setDraft({ ...draft, variants: draft.variants.filter((_, i) => i !== index) })}
  311	                  >
  312	                    <X size={16} />
  313	                  </Button>
  314	                </div>
  315	              ))}
  316	              <Button
  317	                type="button"
  318	                variant="outline"
  319	                size="sm"
  320	                onClick={() => setDraft({ ...draft, variants: [...draft.variants, { name: "", value: "", price: "" }] })}
  321	              >
  322	                <Plus size={15} /> Add option
  323	              </Button>
  324	            </div>
  325	          </div>
  326	
  327	          <label className={styles.field}>
  328	            <span className={styles.label}>Description (optional)</span>
  329	            <Textarea
  330	              value={draft.description}
  331	              onChange={(event) =>
  332	                setDraft({ ...draft, description: event.target.value })
  333	              }
  334	              rows={3}
  335	              placeholder="What it is, what it fits, any warranty."
  336	            />
  337	          </label>
  338	
  339	          <label className={styles.field}>
  340	            <span className={styles.label}>Price</span>
  341	            <Input
  342	              value={draft.price}
  343	              onChange={(event) =>
  344	                setDraft({ ...draft, price: event.target.value })
  345	              }
  346	              placeholder="8000"
  347	              inputMode="decimal"
  348	              className={styles.numberInput}
  349	            />
  350	            <span className={styles.hint}>
  351	              Numbers only. For services quoted on inspection, enter your
  352	              starting price.
  353	            </span>
  354	          </label>
  355	
  356	          <label className={styles.field}>
  357	            <span className={styles.label}>Cost price</span>
  358	            <Input value={draft.costPrice} onChange={(event) => setDraft({ ...draft, costPrice: event.target.value })} placeholder="6000" inputMode="decimal" className={styles.numberInput} />
  359	            <span className={styles.hint}>Your purchase/production cost. Used for profit and ROI reports. Leave empty if unknown.</span>
  360	          </label>
  361	
  362	          <div className={styles.field}>
  363	            <span className={styles.label}>Category</span>
  364	            {categories.length === 0 ? (
  365	              <span className={styles.hint}>
  366	                No categories yet.{" "}
  367	                <Link to="/dashboard/categories" className={styles.inlineLink}>
  368	                  Add one
  369	                </Link>{" "}
  370	                to group your catalogue.
  371	              </span>
  372	            ) : (
  373	              <div className={styles.chips}>
  374	                <button
  375	                  type="button"
  376	                  className={`${styles.chip} ${draft.categoryId === null ? styles.chipActive : ""}`}
  377	                  onClick={() => setDraft({ ...draft, categoryId: null })}
  378	                >
  379	                  None
  380	                </button>
  381	                {categories.map((category) => (
  382	                  <button
  383	                    key={category.id}
  384	                    type="button"
  385	                    className={`${styles.chip} ${draft.categoryId === category.id ? styles.chipActive : ""}`}
  386	                    onClick={() =>
  387	                      setDraft({ ...draft, categoryId: category.id })
  388	                    }
  389	                  >
  390	                    {category.name}
  391	                  </button>
  392	                ))}
  393	              </div>
  394	            )}
  395	          </div>
  396	
  397	          <div className={styles.toggles}>
  398	            <div className={styles.switchRow}>
  399	              <Switch
  400	                id="available"
  401	                checked={draft.available}
  402	                onCheckedChange={(checked) =>
  403	                  setDraft({ ...draft, available: checked })
  404	                }
  405	              />
  406	              <label htmlFor="available" className={styles.switchLabel}>
  407	                <span className={styles.label}>In stock</span>
  408	              </label>
  409	            </div>
  410	            <div className={styles.switchRow}>
  411	              <Switch
  412	                id="featured"
  413	                checked={draft.featured}
  414	                onCheckedChange={(checked) =>
  415	                  setDraft({ ...draft, featured: checked })
  416	                }
  417	              />
  418	              <label htmlFor="featured" className={styles.switchLabel}>
  419	                <span className={styles.label}>Featured</span>
  420	              </label>
  421	            </div>
  422	          </div>
  423	
  424	          <label className={styles.field}>
  425	            <span className={styles.label}>Display order</span>
  426	            <Input
  427	              type="number"
  428	              min={0}
  429	              value={String(draft.sortOrder)}
  430	              onChange={(event) =>
  431	                setDraft({
  432	                  ...draft,
  433	                  sortOrder: Number.parseInt(event.target.value, 10) || 0,
  434	                })
  435	              }
  436	              className={styles.numberInput}
  437	            />
  438	          </label>
  439	
  440	          <div className={styles.formActions}>
  441	            <Button
  442	              onClick={() => {
  443	                void handleSave();
  444	              }}
  445	              disabled={
  446	                save.isPending || uploading || draft.name.trim().length === 0
  447	              }
  448	            >
  449	              {save.isPending ? (
  450	                <>
  451	                  <Spinner size="sm" />
  452	                  Saving
  453	                </>
  454	              ) : draft.id ? (
  455	                "Save changes"
  456	              ) : (
  457	                "Add product"
  458	              )}
  459	            </Button>
  460	            <Button variant="ghost" onClick={() => setDraft(null)}>
  461	              Cancel
  462	            </Button>
  463	          </div>
  464	        </section>
  465	      )}
  466	
  467	      {products.length === 0 && !draft ? (
  468	        <div className={styles.empty}>
  469	          <p className={styles.emptyTitle}>Nothing listed yet.</p>
  470	          <p className={styles.emptyBody}>
  471	            Add your first product or service. A photo and a price are enough —
  472	            you can refine the details later.
  473	          </p>
  474	        </div>
  475	      ) : (
  476	        <ul className={styles.list}>
  477	          {products.map((product) => (
  478	            <li key={product.id} className={styles.row}>
  479	              <div className={styles.thumb}>
  480	                {product.imageUrl ? (
  481	                  <img
  482	                    src={product.imageUrl}
  483	                    alt=""
  484	                    className={styles.thumbImage}
  485	                    loading="lazy"
  486	                  />
  487	                ) : (
  488	                  <ImageOff size={16} className={styles.previewIcon} />
  489	                )}
  490	              </div>
  491	
  492	              <div className={styles.rowText}>
  493	                <span className={styles.rowName}>{product.name}</span>
  494	                <span className={styles.rowMeta}>
  495	                  {formatMoney(product.price, product.currency)}
  496	                  {categoryName(product.categoryId)
  497	                    ? ` · ${categoryName(product.categoryId)}`
  498	                    : ""}
  499	                </span>
  500	              </div>
  501	
  502	              <div className={styles.rowBadges}>
  503	                {product.featured && <Badge variant="warning">Featured</Badge>}
  504	                {!product.available && (
  505	                  <Badge variant="secondary">Out of stock</Badge>
  506	                )}
  507	              </div>
  508	
  509	              {confirmingId === product.id ? (
  510	                <div className={styles.rowActions}>
  511	                  <span className={styles.confirmText}>Delete?</span>
  512	                  <Button
  513	                    variant="destructive"
  514	                    size="sm"
  515	                    disabled={remove.isPending}
  516	                    onClick={() => {
  517	                      void handleDelete(product.id);
  518	                    }}
  519	                  >
  520	                    Yes, delete
  521	                  </Button>
  522	                  <Button
  523	                    variant="ghost"
  524	                    size="sm"
  525	                    onClick={() => setConfirmingId(null)}
  526	                  >
  527	                    Cancel
  528	                  </Button>
  529	                </div>
  530	              ) : (
  531	                <div className={styles.rowActions}>
  532	                  <Button
  533	                    variant="outline"
  534	                    size="icon-sm"
  535	                    aria-label={`Edit ${product.name}`}
  536	                    onClick={() =>
  537	                      setDraft({
  538	                        id: product.id,
  539	                        categoryId: product.categoryId,
  540	                        name: product.name,
  541	                        description: product.description ?? "",
  542	                        price: String(product.price),
  543	                        costPrice: product.costPrice == null ? "" : String(product.costPrice),
  544	                        imageUrl: product.imageUrl,
  545	                        available: product.available,
  546	                        featured: product.featured,
  547	                        sortOrder: product.sortOrder,
  548	                        unit: product.unit ?? "",
  549	                        variants: product.variants.map((variant) => ({
  550	                          name: variant.name,
  551	                          value: variant.value,
  552	                          price: variant.price == null ? "" : String(variant.price),
  553	                        })),
  554	                      })
  555	                    }
  556	                  >
  557	                    <Pencil size={15} />
  558	                  </Button>
  559	                  <Button
  560	                    variant="ghost"
  561	                    size="icon-sm"
  562	                    aria-label={`Delete ${product.name}`}
  563	                    onClick={() => setConfirmingId(product.id)}
  564	                  >
  565	                    <Trash2 size={15} />
  566	                  </Button>
  567	                </div>
  568	              )}
  569	            </li>
  570	          ))}
  571	        </ul>
  572	      )}
  573	    </div>
  574	  );
  575	};
  576	
  577	export default ProductsPage;
