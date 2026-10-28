import { useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Textarea } from "../components/Textarea";
   10	import { useCategories } from "../helpers/useCategories";
   11	import { useCategoryMutations } from "../helpers/useCategoryMutations";
   12	import styles from "./dashboard.categories.module.css";
   13	
   14	type Draft = {
   15	  id: string | null;
   16	  name: string;
   17	  description: string;
   18	  sortOrder: number;
   19	};
   20	
   21	const emptyDraft: Draft = { id: null, name: "", description: "", sortOrder: 0 };
   22	
   23	const CategoriesPage = () => {
   24	  const { data, isFetching, error } = useCategories();
   25	  const { save, remove } = useCategoryMutations();
   26	
   27	  const [draft, setDraft] = useState<Draft | null>(null);
   28	  const [confirmingId, setConfirmingId] = useState<string | null>(null);
   29	
   30	  const categories = data?.categories ?? [];
   31	
   32	  const handleSave = async () => {
   33	    if (!draft) return;
   34	    try {
   35	      await save.mutateAsync({
   36	        id: draft.id,
   37	        name: draft.name,
   38	        description: draft.description,
   39	        sortOrder: draft.sortOrder,
   40	      });
   41	      toast.success(draft.id ? "Category updated." : "Category added.");
   42	      setDraft(null);
   43	    } catch (err) {
   44	      toast.error(
   45	        err instanceof Error ? err.message : "Could not save the category.",
   46	      );
   47	    }
   48	  };
   49	
   50	  const handleDelete = async (id: string) => {
   51	    try {
   52	      await remove.mutateAsync({ id });
   53	      toast.success("Category deleted.");
   54	      setConfirmingId(null);
   55	    } catch (err) {
   56	      toast.error(
   57	        err instanceof Error ? err.message : "Could not delete the category.",
   58	      );
   59	    }
   60	  };
   61	
   62	  if (isFetching && !data) {
   63	    return (
   64	      <div className={styles.page}>
   65	        <Skeleton className={styles.skeletonTitle} />
   66	        <Skeleton className={styles.skeletonBlock} />
   67	      </div>
   68	    );
   69	  }
   70	
   71	  return (
   72	    <div className={styles.page}>
   73	      <Helmet>
   74	        <title>Categories — Oniduka</title>
   75	      </Helmet>
   76	
   77	      <div className={styles.head}>
   78	        <div>
   79	          <h1 className={styles.title}>Categories</h1>
   80	          <p className={styles.subtitle}>
   81	            Groups customers use to filter your catalogue. Optional — products
   82	            without a category still show under All.
   83	          </p>
   84	        </div>
   85	        {!draft && (
   86	          <Button
   87	            onClick={() =>
   88	              setDraft({ ...emptyDraft, sortOrder: categories.length })
   89	            }
   90	          >
   91	            <Plus size={16} />
   92	            Add category
   93	          </Button>
   94	        )}
   95	      </div>
   96	
   97	      {error && (
   98	        <p className={styles.errorText}>
   99	          {error instanceof Error
  100	            ? error.message
  101	            : "Could not load your categories."}
  102	        </p>
  103	      )}
  104	
  105	      {draft && (
  106	        <section className={styles.form}>
  107	          <div className={styles.formHead}>
  108	            <h2 className={styles.formTitle}>
  109	              {draft.id ? "Edit category" : "New category"}
  110	            </h2>
  111	            <Button
  112	              variant="ghost"
  113	              size="icon-sm"
  114	              onClick={() => setDraft(null)}
  115	              aria-label="Cancel"
  116	            >
  117	              <X size={16} />
  118	            </Button>
  119	          </div>
  120	
  121	          <label className={styles.field}>
  122	            <span className={styles.label}>Name</span>
  123	            <Input
  124	              value={draft.name}
  125	              onChange={(event) =>
  126	                setDraft({ ...draft, name: event.target.value })
  127	              }
  128	              placeholder="Chargers & Cables"
  129	            />
  130	          </label>
  131	
  132	          <label className={styles.field}>
  133	            <span className={styles.label}>Description (optional)</span>
  134	            <Textarea
  135	              value={draft.description}
  136	              onChange={(event) =>
  137	                setDraft({ ...draft, description: event.target.value })
  138	              }
  139	              rows={2}
  140	            />
  141	          </label>
  142	
  143	          <label className={styles.field}>
  144	            <span className={styles.label}>Display order</span>
  145	            <Input
  146	              type="number"
  147	              min={0}
  148	              value={String(draft.sortOrder)}
  149	              onChange={(event) =>
  150	                setDraft({
  151	                  ...draft,
  152	                  sortOrder: Number.parseInt(event.target.value, 10) || 0,
  153	                })
  154	              }
  155	              className={styles.numberInput}
  156	            />
  157	            <span className={styles.hint}>Lower numbers appear first.</span>
  158	          </label>
  159	
  160	          <div className={styles.formActions}>
  161	            <Button
  162	              onClick={() => {
  163	                void handleSave();
  164	              }}
  165	              disabled={save.isPending || draft.name.trim().length === 0}
  166	            >
  167	              {save.isPending ? (
  168	                <>
  169	                  <Spinner size="sm" />
  170	                  Saving
  171	                </>
  172	              ) : draft.id ? (
  173	                "Save changes"
  174	              ) : (
  175	                "Add category"
  176	              )}
  177	            </Button>
  178	            <Button variant="ghost" onClick={() => setDraft(null)}>
  179	              Cancel
  180	            </Button>
  181	          </div>
  182	        </section>
  183	      )}
  184	
  185	      {categories.length === 0 && !draft ? (
  186	        <div className={styles.empty}>
  187	          <p className={styles.emptyTitle}>No categories yet.</p>
  188	          <p className={styles.emptyBody}>
  189	            Add a few groups like "Chargers", "Audio" or "Repairs" so customers
  190	            can find things quickly.
  191	          </p>
  192	        </div>
  193	      ) : (
  194	        <ul className={styles.list}>
  195	          {categories.map((category) => (
  196	            <li key={category.id} className={styles.row}>
  197	              <div className={styles.rowText}>
  198	                <span className={styles.rowName}>{category.name}</span>
  199	                {category.description && (
  200	                  <span className={styles.rowDescription}>
  201	                    {category.description}
  202	                  </span>
  203	                )}
  204	              </div>
  205	
  206	              {confirmingId === category.id ? (
  207	                <div className={styles.rowActions}>
  208	                  <span className={styles.confirmText}>Delete?</span>
  209	                  <Button
  210	                    variant="destructive"
  211	                    size="sm"
  212	                    disabled={remove.isPending}
  213	                    onClick={() => {
  214	                      void handleDelete(category.id);
  215	                    }}
  216	                  >
  217	                    Yes, delete
  218	                  </Button>
  219	                  <Button
  220	                    variant="ghost"
  221	                    size="sm"
  222	                    onClick={() => setConfirmingId(null)}
  223	                  >
  224	                    Cancel
  225	                  </Button>
  226	                </div>
  227	              ) : (
  228	                <div className={styles.rowActions}>
  229	                  <Button
  230	                    variant="outline"
  231	                    size="icon-sm"
  232	                    aria-label={`Edit ${category.name}`}
  233	                    onClick={() =>
  234	                      setDraft({
  235	                        id: category.id,
  236	                        name: category.name,
  237	                        description: category.description ?? "",
  238	                        sortOrder: category.sortOrder,
  239	                      })
  240	                    }
  241	                  >
  242	                    <Pencil size={15} />
  243	                  </Button>
  244	                  <Button
  245	                    variant="ghost"
  246	                    size="icon-sm"
  247	                    aria-label={`Delete ${category.name}`}
  248	                    onClick={() => setConfirmingId(category.id)}
  249	                  >
  250	                    <Trash2 size={15} />
  251	                  </Button>
  252	                </div>
  253	              )}
  254	            </li>
  255	          ))}
  256	        </ul>
  257	      )}
  258	    </div>
  259	  );
  260	};
  261	
  262	export default CategoriesPage;
