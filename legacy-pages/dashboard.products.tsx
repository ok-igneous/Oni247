import { useRef, useState } from "react";
import Link from "next/link";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { ImageOff, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { ListToolbar } from "../components/ListToolbar";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Switch } from "../components/Switch";
import { Textarea } from "../components/Textarea";
import { formatMoney } from "../helpers/formatMoney";
import { uploadImage } from "../helpers/uploadImage";
import { useCategories } from "../helpers/useCategories";
import { useProducts } from "../helpers/useProducts";
import { useProductMutations } from "../helpers/useProductMutations";
import { useSubscriptionStatus } from "../helpers/useSubscriptionStatus";
import styles from "./dashboard.products.module.css";

type Draft = {
  id: string | null;
  categoryId: string | null;
  name: string;
  description: string;
  price: string;
  costPrice: string;
  imageUrl: string | null;
  available: boolean;
  featured: boolean;
  sortOrder: number;
  unit: string;
  variants: { name: string; value: string; price: string }[];
  /** Blank = stock is not tracked. */
  stockQuantity: string;
  compareAtPrice: string;
  images: string[];
};

const emptyDraft: Draft = {
  id: null,
  categoryId: null,
  name: "",
  description: "",
  price: "",
  costPrice: "",
  imageUrl: null,
  available: true,
  featured: false,
  sortOrder: 0,
  unit: "",
  variants: [],
  stockQuantity: "",
  compareAtPrice: "",
  images: [],
};

const ProductsPage = () => {
  const { data, isFetching, error } = useProducts();
  const { data: categoryData } = useCategories();
  const { data: plan } = useSubscriptionStatus();
  const { save, remove } = useProductMutations();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extraInputRef = useRef<HTMLInputElement>(null);
  const [uploadingExtra, setUploadingExtra] = useState(false);

  const products = data?.products ?? [];
  const categories = categoryData?.categories ?? [];
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const visibleProducts = products.filter((product) => {
    const term = query.trim().toLowerCase();
    const matchesTerm =
      term === "" ||
      product.name.toLowerCase().includes(term) ||
      (product.description ?? "").toLowerCase().includes(term);
    const soldOut = !product.available || product.stockQuantity === 0;
    const low =
      product.stockQuantity !== null && product.stockQuantity > 0 && product.stockQuantity <= 5;
    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "in" && !soldOut) ||
      (stockFilter === "out" && soldOut) ||
      (stockFilter === "low" && low);
    const matchesCategory =
      categoryFilter === "all" || product.categoryId === categoryFilter;
    return matchesTerm && matchesStock && matchesCategory;
  });
  const atLimit =
    plan?.productLimit != null && products.length >= plan.productLimit;
  const categoryName = (id: string | null) =>
    categories.find((category) => category.id === id)?.name ?? null;

  const handleFile = async (file: File | undefined) => {
    if (!file || !draft) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "product");
      setDraft((current) => (current ? { ...current, imageUrl: url } : current));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "The image failed to upload.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    const price = Number.parseFloat(draft.price);
    if (Number.isNaN(price) || price < 0) {
      toast.error("Enter a price, using numbers only.");
      return;
    }
    const stockText = draft.stockQuantity.trim();
    const stockQuantity = stockText === "" ? null : Number.parseInt(stockText, 10);
    if (stockQuantity !== null && (Number.isNaN(stockQuantity) || stockQuantity < 0)) {
      toast.error("Stock must be a whole number, or leave it blank.");
      return;
    }
    const compareText = draft.compareAtPrice.trim();
    const compareAtPrice = compareText === "" ? null : Number.parseFloat(compareText);
    if (compareAtPrice !== null && (Number.isNaN(compareAtPrice) || compareAtPrice <= price)) {
      toast.error("The 'was' price must be higher than the current price.");
      return;
    }
    try {
      await save.mutateAsync({
        id: draft.id,
        categoryId: draft.categoryId,
        name: draft.name,
        description: draft.description,
        price,
        costPrice: draft.costPrice.trim() === "" ? null : Number.parseFloat(draft.costPrice),
        imageUrl: draft.imageUrl,
        available: draft.available,
        featured: draft.featured,
        sortOrder: draft.sortOrder,
        unit: draft.unit.trim() || null,
        stockQuantity,
        compareAtPrice,
        images: draft.images,
        variants: draft.variants
          .filter((variant) => variant.name.trim() && variant.value.trim())
          .map((variant) => ({
            name: variant.name.trim(),
            value: variant.value.trim(),
            price: variant.price.trim() ? Number.parseFloat(variant.price) : null,
          })),
      });
      toast.success(draft.id ? "Product updated." : "Product added.");
      setDraft(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save the product.",
      );
    }
  };

  const handleExtraFile = async (file: File | undefined) => {
    if (!file || !draft) return;
    setUploadingExtra(true);
    try {
      const url = await uploadImage(file, "product");
      setDraft((current) =>
        current && current.images.length < 7
          ? { ...current, images: [...current.images, url] }
          : current,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The image failed to upload.");
    } finally {
      setUploadingExtra(false);
      if (extraInputRef.current) extraInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync({ id });
      toast.success("Product deleted.");
      setConfirmingId(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete the product.",
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
        <title>Products — Oni247</title>
      </Helmet>

      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Products &amp; services</h1>
          <p className={styles.subtitle}>
            Everything listed here appears on your public page. Unavailable
            items stay visible but cannot be added to an order.
          </p>
        </div>
        {!draft && (
          <Button
            disabled={atLimit}
            onClick={() =>
              setDraft({ ...emptyDraft, sortOrder: products.length })
            }
          >
            <Plus size={16} />
            Add product
          </Button>
        )}
      </div>

      {plan?.productLimit != null && (
        <p className={styles.planNote}>
          {atLimit
            ? `You have used all ${plan.productLimit} products on the free plan. `
            : `Using ${products.length} of ${plan.productLimit} products on the free plan. `}
          <Link href="/dashboard/plan" className={styles.inlineLink}>
            See Premium
          </Link>
        </p>
      )}

      {error && (
        <p className={styles.errorText}>
          {error instanceof Error ? error.message : "Could not load products."}
        </p>
      )}

      {draft && (
        <section className={styles.form}>
          <div className={styles.formHead}>
            <h2 className={styles.formTitle}>
              {draft.id ? "Edit product" : "New product"}
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

          <div className={styles.imageField}>
            <div className={styles.preview}>
              {draft.imageUrl ? (
                <img
                  src={draft.imageUrl}
                  alt=""
                  className={styles.previewImage}
                />
              ) : (
                <ImageOff size={20} className={styles.previewIcon} />
              )}
            </div>
            <div className={styles.imageActions}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className={styles.fileInput}
                onChange={(event) => {
                  void handleFile(event.target.files?.[0]);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Spinner size="sm" /> : <Upload size={15} />}
                {uploading ? "Uploading" : draft.imageUrl ? "Replace" : "Upload photo"}
              </Button>
              {draft.imageUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft({ ...draft, imageUrl: null })}
                >
                  Remove
                </Button>
              )}
              <span className={styles.hint}>PNG, JPG or WebP, up to 3 MB.</span>
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>More photos</span>
            <span className={styles.hint}>
              Extra angles shown as a gallery on the product page. Up to 7.
            </span>
            <div className={styles.imageActions}>
              {draft.images.map((url, index) => (
                <div key={url} className={styles.imageActions}>
                  <div className={styles.preview}>
                    <img src={url} alt="" className={styles.previewImage} />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        images: draft.images.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <X size={14} />
                  </Button>
                </div>
              ))}
              <input
                ref={extraInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className={styles.fileInput}
                onChange={(event) => {
                  void handleExtraFile(event.target.files?.[0]);
                }}
              />
              {draft.images.length < 7 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingExtra}
                  onClick={() => extraInputRef.current?.click()}
                >
                  {uploadingExtra ? <Spinner size="sm" /> : <Plus size={15} />}
                  {uploadingExtra ? "Uploading" : "Add photo"}
                </Button>
              )}
              {draft.images.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft({ ...draft, images: [] })}
                >
                  Remove all
                </Button>
              )}
            </div>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <Input
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="65W USB-C Fast Charger"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Unit</span>
            <Input
              value={draft.unit}
              onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
              placeholder="piece, kg, litre, pack"
            />
            <span className={styles.hint}>Optional. Shown with the product price.</span>
          </label>

          <div className={styles.field}>
            <span className={styles.label}>Varieties / options</span>
            <span className={styles.hint}>Add options such as Color, Size, Material or any other choice customers need.</span>
            <div className={styles.variantList}>
              {draft.variants.map((variant, index) => (
                <div key={index} className={styles.variantRow}>
                  <Input
                    value={variant.name}
                    onChange={(event) => {
                      const variants = [...draft.variants];
                      variants[index] = { ...variant, name: event.target.value };
                      setDraft({ ...draft, variants });
                    }}
                    placeholder="Color"
                    aria-label="Option name"
                  />
                  <Input
                    value={variant.value}
                    onChange={(event) => {
                      const variants = [...draft.variants];
                      variants[index] = { ...variant, value: event.target.value };
                      setDraft({ ...draft, variants });
                    }}
                    placeholder="Black"
                    aria-label="Option value"
                  />
                  <Input
                    value={variant.price}
                    onChange={(event) => {
                      const variants = [...draft.variants];
                      variants[index] = { ...variant, price: event.target.value };
                      setDraft({ ...draft, variants });
                    }}
                    placeholder="Price override"
                    inputMode="decimal"
                    aria-label="Variant price override"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove option"
                    onClick={() => setDraft({ ...draft, variants: draft.variants.filter((_, i) => i !== index) })}
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDraft({ ...draft, variants: [...draft.variants, { name: "", value: "", price: "" }] })}
              >
                <Plus size={15} /> Add option
              </Button>
            </div>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Description (optional)</span>
            <Textarea
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              rows={3}
              placeholder="What it is, what it fits, any warranty."
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Price</span>
            <Input
              value={draft.price}
              onChange={(event) =>
                setDraft({ ...draft, price: event.target.value })
              }
              placeholder="8000"
              inputMode="decimal"
              className={styles.numberInput}
            />
            <span className={styles.hint}>
              Numbers only. For services quoted on inspection, enter your
              starting price.
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Cost price</span>
            <Input value={draft.costPrice} onChange={(event) => setDraft({ ...draft, costPrice: event.target.value })} placeholder="6000" inputMode="decimal" className={styles.numberInput} />
            <span className={styles.hint}>Your purchase/production cost. Used for profit and ROI reports. Leave empty if unknown.</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>"Was" price (optional)</span>
            <Input
              value={draft.compareAtPrice}
              onChange={(event) => setDraft({ ...draft, compareAtPrice: event.target.value })}
              placeholder="10000"
              inputMode="decimal"
              className={styles.numberInput}
            />
            <span className={styles.hint}>
              A higher old price. Customers see it struck through with the discount.
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Stock quantity (optional)</span>
            <Input
              value={draft.stockQuantity}
              onChange={(event) => setDraft({ ...draft, stockQuantity: event.target.value })}
              placeholder="Leave blank to not track stock"
              inputMode="numeric"
              className={styles.numberInput}
            />
            <span className={styles.hint}>
              Each online order reduces it, and a cancelled order puts it back. At 0 the
              product shows as sold out; at 5 or fewer customers see &quot;Only N left&quot;.
            </span>
          </label>

          <div className={styles.field}>
            <span className={styles.label}>Category</span>
            {categories.length === 0 ? (
              <span className={styles.hint}>
                No categories yet.{" "}
                <Link href="/dashboard/categories" className={styles.inlineLink}>
                  Add one
                </Link>{" "}
                to group your catalogue.
              </span>
            ) : (
              <div className={styles.chips}>
                <button
                  type="button"
                  className={`${styles.chip} ${draft.categoryId === null ? styles.chipActive : ""}`}
                  onClick={() => setDraft({ ...draft, categoryId: null })}
                >
                  None
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`${styles.chip} ${draft.categoryId === category.id ? styles.chipActive : ""}`}
                    onClick={() =>
                      setDraft({ ...draft, categoryId: category.id })
                    }
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.toggles}>
            <div className={styles.switchRow}>
              <Switch
                id="available"
                checked={draft.available}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, available: checked })
                }
              />
              <label htmlFor="available" className={styles.switchLabel}>
                <span className={styles.label}>In stock</span>
                <span className={styles.hint}>Turn off to hide the Add button.</span>
              </label>
            </div>
            <div className={styles.switchRow}>
              <Switch
                id="featured"
                checked={draft.featured}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, featured: checked })
                }
              />
              <label htmlFor="featured" className={styles.switchLabel}>
                <span className={styles.label}>Featured</span>
              </label>
            </div>
          </div>

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
          </label>

          <div className={styles.formActions}>
            <Button
              onClick={() => {
                void handleSave();
              }}
              disabled={
                save.isPending || uploading || draft.name.trim().length === 0
              }
            >
              {save.isPending ? (
                <>
                  <Spinner size="sm" />
                  Saving
                </>
              ) : draft.id ? (
                "Save changes"
              ) : (
                "Add product"
              )}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      {products.length === 0 && !draft ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nothing listed yet.</p>
          <p className={styles.emptyBody}>
            Add your first product or service. A photo and a price are enough —
            you can refine the details later.
          </p>
        </div>
      ) : (
        <>
        <ListToolbar
          search={query}
          onSearch={setQuery}
          placeholder="Search products"
          shown={visibleProducts.length}
          total={products.length}
          filters={[
            {
              id: "stock",
              label: "Availability",
              value: stockFilter,
              onChange: setStockFilter,
              options: [
                { value: "in", label: "Available" },
                { value: "low", label: "Low stock" },
                { value: "out", label: "Sold out" },
              ],
            },
            ...(categories.length > 0
              ? [
                  {
                    id: "category",
                    label: "Category",
                    value: categoryFilter,
                    onChange: setCategoryFilter,
                    options: categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                  },
                ]
              : []),
          ]}
        />
        {visibleProducts.length === 0 && (
          <p className={styles.emptyBody}>No product matches that search.</p>
        )}
        <ul className={styles.list}>
          {visibleProducts.map((product) => (
            <li key={product.id} className={styles.row}>
              <div className={styles.thumb}>
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt=""
                    className={styles.thumbImage}
                    loading="lazy"
                  />
                ) : (
                  <ImageOff size={16} className={styles.previewIcon} />
                )}
              </div>

              <div className={styles.rowText}>
                <span className={styles.rowName}>{product.name}</span>
                <span className={styles.rowMeta}>
                  {formatMoney(product.price, product.currency)}
                  {categoryName(product.categoryId)
                    ? ` · ${categoryName(product.categoryId)}`
                    : ""}
                </span>
              </div>

              <div className={styles.rowBadges}>
                {product.featured && <Badge variant="warning">Featured</Badge>}
                {!product.available && (
                  <Badge variant="secondary">Out of stock</Badge>
                )}
                {product.available && product.stockQuantity === 0 && (
                  <Badge variant="secondary">Sold out</Badge>
                )}
                {product.available &&
                  product.stockQuantity !== null &&
                  product.stockQuantity > 0 &&
                  product.stockQuantity <= 5 && (
                    <Badge variant="warning">{product.stockQuantity} left</Badge>
                  )}
                {product.available && product.stockQuantity !== null && product.stockQuantity > 5 && (
                  <Badge variant="outline">{product.stockQuantity} in stock</Badge>
                )}
              </div>

              {confirmingId === product.id ? (
                <div className={styles.rowActions}>
                  <span className={styles.confirmText}>Delete?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => {
                      void handleDelete(product.id);
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
                    aria-label={`Edit ${product.name}`}
                    onClick={() =>
                      setDraft({
                        id: product.id,
                        categoryId: product.categoryId,
                        name: product.name,
                        description: product.description ?? "",
                        price: String(product.price),
                        costPrice: product.costPrice == null ? "" : String(product.costPrice),
                        imageUrl: product.imageUrl,
                        available: product.available,
                        featured: product.featured,
                        sortOrder: product.sortOrder,
                        unit: product.unit ?? "",
                        stockQuantity:
                          product.stockQuantity == null ? "" : String(product.stockQuantity),
                        compareAtPrice:
                          product.compareAtPrice == null ? "" : String(product.compareAtPrice),
                        images: product.images,
                        variants: product.variants.map((variant) => ({
                          name: variant.name,
                          value: variant.value,
                          price: variant.price == null ? "" : String(variant.price),
                        })),
                      })
                    }
                  >
                    <Pencil size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${product.name}`}
                    onClick={() => setConfirmingId(product.id)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  );
};

export default ProductsPage;
