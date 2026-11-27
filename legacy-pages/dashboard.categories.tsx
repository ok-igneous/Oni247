import { useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Textarea } from "../components/Textarea";
import { useCategories } from "../helpers/useCategories";
import { useCategoryMutations } from "../helpers/useCategoryMutations";
import styles from "./dashboard.categories.module.css";

type Draft = {
  id: string | null;
  name: string;
  description: string;
  sortOrder: number;
};

const emptyDraft: Draft = { id: null, name: "", description: "", sortOrder: 0 };

const CategoriesPage = () => {
  const { data, isFetching, error } = useCategories();
  const { save, remove } = useCategoryMutations();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const categories = data?.categories ?? [];

  const handleSave = async () => {
    if (!draft) return;
    try {
      await save.mutateAsync({
        id: draft.id,
        name: draft.name,
        description: draft.description,
        sortOrder: draft.sortOrder,
      });
      toast.success(draft.id ? "Category updated." : "Category added.");
      setDraft(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save the category.",
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync({ id });
      toast.success("Category deleted.");
      setConfirmingId(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete the category.",
      );
    }
  };

  if (isFetching && !data) {
    return (
      <div className={styles.page}>
        <Skeleton className={styles.skeletonTitle} />
        <Skeleton className={styles.skeletonBlock} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Categories — Oni247</title>
      </Helmet>

      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Categories</h1>
          <p className={styles.subtitle}>
            Groups customers use to filter your catalogue. Optional — products
            without a category still show under All.
          </p>
        </div>
        {!draft && (
          <Button
            onClick={() =>
              setDraft({ ...emptyDraft, sortOrder: categories.length })
            }
          >
            <Plus size={16} />
            Add category
          </Button>
        )}
      </div>

      {error && (
        <p className={styles.errorText}>
          {error instanceof Error
            ? error.message
            : "Could not load your categories."}
        </p>
      )}

      {draft && (
        <section className={styles.form}>
          <div className={styles.formHead}>
            <h2 className={styles.formTitle}>
              {draft.id ? "Edit category" : "New category"}
            </h2>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDraft(null)}
              aria-label="Cancel"
            >
              <X size={16} />
            </Button>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <Input
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="Chargers & Cables"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Description (optional)</span>
            <Textarea
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              rows={2}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Display order</span>
            <Input
              type="number"
              min={0}
              value={String(draft.sortOrder)}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  sortOrder: Number.parseInt(event.target.value, 10) || 0,
                })
              }
              className={styles.numberInput}
            />
            <span className={styles.hint}>Lower numbers appear first.</span>
          </label>

          <div className={styles.formActions}>
            <Button
              onClick={() => {
                void handleSave();
              }}
              disabled={save.isPending || draft.name.trim().length === 0}
            >
              {save.isPending ? (
                <>
                  <Spinner size="sm" />
                  Saving
                </>
              ) : draft.id ? (
                "Save changes"
              ) : (
                "Add category"
              )}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      {categories.length === 0 && !draft ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No categories yet.</p>
          <p className={styles.emptyBody}>
            Add a few groups like "Chargers", "Audio" or "Repairs" so customers
            can find things quickly.
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {categories.map((category) => (
            <li key={category.id} className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowName}>{category.name}</span>
                {category.description && (
                  <span className={styles.rowDescription}>
                    {category.description}
                  </span>
                )}
              </div>

              {confirmingId === category.id ? (
                <div className={styles.rowActions}>
                  <span className={styles.confirmText}>Delete?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => {
                      void handleDelete(category.id);
                    }}
                  >
                    Yes, delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className={styles.rowActions}>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Edit ${category.name}`}
                    onClick={() =>
                      setDraft({
                        id: category.id,
                        name: category.name,
                        description: category.description ?? "",
                        sortOrder: category.sortOrder,
                      })
                    }
                  >
                    <Pencil size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${category.name}`}
                    onClick={() => setConfirmingId(category.id)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CategoriesPage;