import { useMemo, useState } from "react";
import { PackageSearch, Search } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./Select";
import { StoreProductCard, type StoreProduct } from "./StoreProductCard";
import { StoreOptionsDialog } from "./StoreOptionsDialog";
import type { useStoreCart } from "../helpers/useStoreCart";
import styles from "./StoreCatalogue.module.css";

type Category = { id: string; name: string };
type SortKey = "featured" | "price_asc" | "price_desc" | "name";
type CatalogueProduct = StoreProduct & { categoryId: string | null };

interface Props {
  products: CatalogueProduct[];
  categories: Category[];
  businessSlug: string;
  /** Product pages are a Premium feature; without it cards do not link out. */
  linkToProducts: boolean;
  cart: ReturnType<typeof useStoreCart>;
  onAddedToCart: () => void;
}

const PAGE_SIZE = 12;

/** Search, category filter, sort and add-to-cart for a list of products. */
export const StoreCatalogue = ({
  products,
  categories,
  businessSlug,
  linkToProducts,
  cart,
  onAddedToCart,
}: Props) => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("featured");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [optionsProduct, setOptionsProduct] = useState<StoreProduct | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      const id = product.categoryId;
      if (id) map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const shownCategories = categories.filter((category) => (counts.get(category.id) ?? 0) > 0);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const inCategory = !activeCategory || product.categoryId === activeCategory;
      const matches =
        term.length === 0 ||
        product.name.toLowerCase().includes(term) ||
        (product.description ?? "").toLowerCase().includes(term);
      return inCategory && matches;
    });
    if (sort === "price_asc") return [...filtered].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") return [...filtered].sort((a, b) => b.price - a.price);
    if (sort === "name") return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [products, search, activeCategory, sort]);

  const resetPaging = () => setVisibleCount(PAGE_SIZE);

  const handleAdd = (product: StoreProduct) => {
    if ((product.variants?.length ?? 0) > 0) {
      setOptionsProduct(product);
      return;
    }
    cart.add({
      productId: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency,
      imageUrl: product.imageUrl,
      maxQuantity: product.stockQuantity ?? null,
    });
    onAddedToCart();
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.searchWrap}>
        <Search size={18} className={styles.searchIcon} aria-hidden="true" />
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            resetPaging();
          }}
          placeholder="Search products"
          aria-label="Search products"
          className={styles.searchInput}
        />
      </div>

      {shownCategories.length > 0 && (
        <div className={styles.chips} role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`${styles.chip} ${activeCategory === null ? styles.chipActive : ""}`}
            aria-pressed={activeCategory === null}
            onClick={() => {
              setActiveCategory(null);
              resetPaging();
            }}
          >
            All ({products.length})
          </button>
          {shownCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`${styles.chip} ${activeCategory === category.id ? styles.chipActive : ""}`}
              aria-pressed={activeCategory === category.id}
              onClick={() => {
                setActiveCategory(category.id);
                resetPaging();
              }}
            >
              {category.name} ({counts.get(category.id) ?? 0})
            </button>
          ))}
        </div>
      )}

      {products.length > 1 && (
        <div className={styles.toolbar}>
          <span className={styles.count}>
            {visible.length} {visible.length === 1 ? "item" : "items"}
          </span>
          <Select
            value={sort}
            onValueChange={(value) => {
              setSort(value as SortKey);
              resetPaging();
            }}
          >
            <SelectTrigger className={styles.sort} aria-label="Sort products">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Default order</SelectItem>
              <SelectItem value="price_asc">Price: low to high</SelectItem>
              <SelectItem value="price_desc">Price: high to low</SelectItem>
              <SelectItem value="name">Name: A to Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {visible.length > 0 ? (
        <>
          <div className={styles.grid}>
            {visible.slice(0, visibleCount).map((product) => (
              <StoreProductCard
                key={product.id}
                product={product}
                to={linkToProducts ? `/${businessSlug}/p/${product.slug}` : undefined}
                onAdd={handleAdd}
              />
            ))}
          </div>
          {visible.length > visibleCount && (
            <div className={styles.more}>
              <Button variant="outline" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                Show more ({visible.length - visibleCount} left)
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.empty}>
          <PackageSearch size={28} aria-hidden="true" />
          <p className={styles.emptyTitle}>
            {products.length === 0 ? "No products yet." : "Nothing matches your search."}
          </p>
          {products.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setActiveCategory(null);
              }}
            >
              Clear search and filters
            </Button>
          )}
        </div>
      )}

      <StoreOptionsDialog
        product={optionsProduct}
        onClose={() => setOptionsProduct(null)}
        onConfirm={(item) => {
          cart.add(item);
          onAddedToCart();
        }}
      />
    </div>
  );
};
