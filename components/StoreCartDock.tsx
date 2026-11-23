import { Link } from "react-router-dom";
import { ImageOff, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { formatMoney } from "../helpers/formatMoney";
import type { useStoreCart } from "../helpers/useStoreCart";
import styles from "./StoreCartDock.module.css";

interface Props {
  slug: string;
  currency: string;
  cart: ReturnType<typeof useStoreCart>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

/** Floating cart bar + panel. Checkout itself lives on its own page. */
export const StoreCartDock = ({
  slug,
  currency,
  cart,
  open,
  onOpenChange,
  className,
}: Props) => {
  if (cart.count === 0) return null;

  return (
    <div className={`${styles.dock} ${className ?? ""}`}>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Your cart">
          <div className={styles.head}>
            <h2 className={styles.title}>Your cart</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              aria-label="Close cart"
            >
              <X size={16} />
            </Button>
          </div>

          <ul className={styles.lines}>
            {cart.items.map((line) => (
              <li key={line.lineId} className={styles.line}>
                <div className={styles.thumb}>
                  {line.imageUrl ? (
                    <img src={line.imageUrl} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <ImageOff size={16} />
                  )}
                </div>
                <div className={styles.lineBody}>
                  <span className={styles.lineName}>{line.name}</span>
                  {line.variantLabel && (
                    <span className={styles.lineMeta}>{line.variantLabel}</span>
                  )}
                  <span className={styles.linePrice}>
                    {formatMoney(line.price * line.quantity, line.currency)}
                  </span>
                  <div className={styles.lineControls}>
                    <div className={styles.stepper}>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => cart.setQuantity(line.lineId, line.quantity - 1)}
                        aria-label={`Reduce ${line.name}`}
                      >
                        <Minus size={14} />
                      </Button>
                      <span className={styles.qty}>{line.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={
                          typeof line.maxQuantity === "number" &&
                          line.quantity >= line.maxQuantity
                        }
                        onClick={() => cart.setQuantity(line.lineId, line.quantity + 1)}
                        aria-label={`Add another ${line.name}`}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => cart.remove(line.lineId)}
                      aria-label={`Remove ${line.name}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <strong>{formatMoney(cart.total, currency)}</strong>
            </div>
            <span className={styles.hint}>
              Delivery and payment are chosen at checkout.
            </span>
          </div>

          <div className={styles.actions}>
            <Button asChild className={styles.checkout} size="lg">
              <Link to={`/${slug}/checkout`}>Checkout</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={cart.clear}>
              Clear cart
            </Button>
          </div>
        </div>
      )}

      <button
        type="button"
        className={styles.bar}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        <span className={styles.barLeft}>
          <ShoppingBag size={18} />
          <Badge variant="secondary" className={styles.count}>
            {cart.count}
          </Badge>
          <span>{open ? "Hide cart" : "View cart"}</span>
        </span>
        <span className={styles.barTotal}>{formatMoney(cart.total, currency)}</span>
      </button>
    </div>
  );
};