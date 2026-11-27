import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { Copy, ExternalLink, Eye, Plus, Trash2, X } from "lucide-react";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Textarea } from "../components/Textarea";
import { formatMoney } from "../helpers/formatMoney";
import { useProducts } from "../helpers/useProducts";
import { useMyBusiness } from "../helpers/useMyBusiness";
import { useShowcases } from "../helpers/useShowcases";
import styles from "./dashboard.share.module.css";

const DashboardSharePage = () => {
  const { list, save, remove } = useShowcases();
  const { data: productData } = useProducts();
  const { data: businessData } = useMyBusiness();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);

  const products = productData?.products ?? [];
  const shopSlug = businessData?.business?.slug ?? "";
  const primaryDomain = businessData?.primaryDomain ?? null;
  const publicUrl = (path: string, includeBusinessSlug = false) => {
    const base = primaryDomain ? `https://${primaryDomain}` : `https://${businessData?.platformRootDomain ?? "oni247.org"}`;
    const route = !primaryDomain && includeBusinessSlug && shopSlug ? `/${shopSlug}${path}` : path;
    return `${base}${route}`;
  };
  const showcases = useMemo(() => list.data?.showcases ?? [], [list.data]);

  const reset = () => {
    setOpen(false);
    setEditingId(null);
    setTitle("");
    setDescription("");
    setSelected([]);
  };

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  const submit = async () => {
    try {
      const result = await save.mutateAsync({
        id: editingId,
        title,
        description,
        productIds: selected,
      });
      toast.success(
        editingId ? "Collection updated." : `Collection ready — /s/${result.showcase.code}`,
      );
      reset();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save the collection.",
      );
    }
  };

  const copyLink = (path: string, includeBusinessSlug = false) => {
    void navigator.clipboard
      .writeText(publicUrl(path, includeBusinessSlug))
      .then(() => toast.success("Link copied."))
      .catch(() => toast.error("Could not copy the link."));
  };

  const deleteShowcase = async (id: string) => {
    try {
      await remove.mutateAsync({ id });
      toast.success("Collection deleted.");
      setConfirming(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete the collection.",
      );
    }
  };

  if (list.isFetching && !list.data) {
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
        <title>Share — Oni247</title>
      </Helmet>

      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Share</h1>
          <p className={styles.subtitle}>
            Group products into one link for WhatsApp status, Instagram or
            Facebook. Every product also has its own link below.
          </p>
        </div>
        {!open && (
          <Button onClick={() => setOpen(true)} disabled={products.length === 0}>
            <Plus size={16} />
            New collection
          </Button>
        )}
      </div>

      {open && (
        <section className={styles.form}>
          <div className={styles.formHead}>
            <h2 className={styles.formTitle}>
              {editingId ? "Edit collection" : "New collection"}
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={reset} aria-label="Cancel">
              <X size={16} />
            </Button>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Title</span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="December deals"
            />
            <span className={styles.hint}>
              This is the headline people see when the link is shared.
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Description (optional)</span>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </label>

          <div className={styles.field}>
            <span className={styles.label}>
              Products ({selected.length} selected)
            </span>
            <div className={styles.picker}>
              {products.map((product) => (
                <label key={product.id} className={styles.pickerRow}>
                  <Checkbox
                    checked={selected.includes(product.id)}
                    onChange={() => toggle(product.id)}
                  />
                  <span className={styles.pickerText}>
                    <span className={styles.pickerName}>{product.name}</span>
                    <span className={styles.pickerPrice}>
                      {formatMoney(product.price, product.currency)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formActions}>
            <Button
              onClick={() => {
                void submit();
              }}
              disabled={
                save.isPending || title.trim().length === 0 || selected.length === 0
              }
            >
              {save.isPending ? <Spinner size="sm" /> : null}
              {editingId ? "Save changes" : "Create link"}
            </Button>
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <section>
        <h2 className={styles.sectionHeading}>Collections</h2>
        {showcases.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No collections yet.</p>
            <p className={styles.emptyBody}>
              Pick a few products, give them a title, and you get one link worth
              posting.
            </p>
          </div>
        ) : (
          <ul className={styles.list}>
            {showcases.map((showcase) => (
              <li key={showcase.id} className={styles.row}>
                <div className={styles.rowText}>
                  <span className={styles.rowName}>{showcase.title}</span>
                  <span className={styles.rowMeta}>
                    /s/{showcase.code} · {showcase.productIds.length} products
                  </span>
                </div>
                <span className={styles.views}>
                  <Eye size={13} />
                  {showcase.viewCount}
                </span>
                <div className={styles.rowActions}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyLink(`/s/${showcase.code}`)}
                  >
                    <Copy size={14} />
                    Copy
                  </Button>
                  <Button asChild variant="ghost" size="icon-sm">
                    <a
                      href={`/s/${showcase.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${showcase.title}`}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </Button>
                  {confirming === showcase.id ? (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => {
                          void deleteShowcase(showcase.id);
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirming(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${showcase.title}`}
                      onClick={() => setConfirming(showcase.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className={styles.sectionHeading}>Product links</h2>
        {products.length === 0 ? (
          <p className={styles.emptyBody}>Add a product to get its link.</p>
        ) : (
          <ul className={styles.list}>
            {products.map((product) => (
              <li key={product.id} className={styles.row}>
                <div className={styles.rowText}>
                  <span className={styles.rowName}>{product.name}</span>
                  <span className={styles.rowMeta}>
                    {primaryDomain ? "" : `/${shopSlug}`}/p/{product.slug}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!shopSlug}
                    onClick={() =>
                      copyLink(`/p/${product.slug}`, true)
                    }
                  >
                    <Copy size={14} />
                    Copy
                  </Button>
                  <Button asChild variant="ghost" size="icon-sm">
                    <a
                      href={publicUrl(`/p/${product.slug}`, true)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${product.name}`}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default DashboardSharePage;
