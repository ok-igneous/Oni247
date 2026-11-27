import Link from "next/link";
import { ImageOff, Plus } from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { formatMoney } from "../helpers/formatMoney";
import styles from "./StoreProductCard.module.css";

export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
  available: boolean;
  featured: boolean;
  unit?: string | null;
  variants?: Array<{ name: string; value: string; price: number | null }>;
  stockQuantity?: number | null;
  compareAtPrice?: number | null;
};

interface Props {
  product: StoreProduct;
  /** Product detail route, when the theme links through to one. */
  to?: string;
  layout?: "grid" | "row";
  onAdd: (product: StoreProduct) => void;
  className?: string;
}

export const StoreProductCardNext = ({
  product,
  to,
  layout = "grid",
  onAdd,
  className,
}: Props) => {
  const hasOptions = (product.variants?.length ?? 0) > 0;
  const lowStock =
    product.available &&
    typeof product.stockQuantity === "number" &&
    product.stockQuantity > 0 &&
    product.stockQuantity <= 5;
  const onSale =
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > product.price;
  const percentOff = onSale
    ? Math.round(
        (1 - product.price / (product.compareAtPrice as number)) * 100,
      )
    : 0;

  const media = (
    <div className={styles.media}>
      {product.imageUrl ? (
        <img
          className={styles.image}
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className={styles.placeholder} aria-hidden="true">
          <ImageOff size={22} />
        </div>
      )}
      {product.featured && (
        <Badge variant="warning" className={styles.featuredBadge}>
          Featured
        </Badge>
      )}
      {onSale && percentOff > 0 && product.available && (
        <Badge variant="destructive" className={styles.saleBadge}>
          −{percentOff}%
        </Badge>
      )}
      {!product.available && (
        <div className={styles.soldOut}>
          <span>Out of stock</span>
        </div>
      )}
    </div>
  );

  return (
    <article
      className={`${styles.card} ${layout === "row" ? styles.rowCard : ""} ${className ?? ""}`}
    >
      {to ? (
        <Link href={to} className={styles.mediaLink} aria-label={product.name}>
          {media}
        </Link>
      ) : (
        media
      )}

      <div className={styles.body}>
        <h3 className={styles.name}>
          {to ? (
            <Link href={to} className={styles.nameLink}>
              {product.name}
            </Link>
          ) : (
            product.name
          )}
        </h3>
        {product.description && (
          <p className={styles.description}>{product.description}</p>
        )}
        {lowStock && (
          <span className={styles.lowStock}>Only {product.stockQuantity} left</span>
        )}
        <div className={styles.footer}>
          <span className={styles.priceWrap}>
            {hasOptions && <span className={styles.from}>From </span>}
            <span className={styles.price}>
              {formatMoney(product.price, product.currency)}
              {product.unit ? " / " + product.unit : ""}
            </span>
            {onSale && (
              <s className={styles.was}>
                {formatMoney(product.compareAtPrice as number, product.currency)}
              </s>
            )}
          </span>
          <Button
            size="sm"
            variant={product.available ? "primary" : "outline"}
            disabled={!product.available}
            onClick={() => onAdd(product)}
            aria-label={
              hasOptions
                ? `Choose options for ${product.name}`
                : `Add ${product.name} to cart`
            }
          >
            <Plus size={15} />
            {hasOptions ? "Options" : "Add"}
          </Button>
        </div>
      </div>
    </article>
  );
};
