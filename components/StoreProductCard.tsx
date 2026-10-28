import { Link } from "react-router-dom";
import { ImageOff, Plus } from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { formatMoney } from "../helpers/formatMoney";
import styles from "./StoreProductCard.module.css";

export type StoreProduct = {
  id: string;
   10	  name: string;
   11	  slug: string;
   12	  description: string | null;
   13	  price: number;
   14	  currency: string;
   15	  imageUrl: string | null;
   16	  available: boolean;
   17	  featured: boolean;
   18	  unit?: string | null;
   19	};
   20	
   21	interface Props {
   22	  product: StoreProduct;
   23	  /** Product detail route, when the theme links through to one. */
   24	  to?: string;
   25	  layout?: "grid" | "row";
   26	  onAdd: (product: StoreProduct) => void;
   27	  className?: string;
   28	}
   29	
   30	export const StoreProductCard = ({
   31	  product,
   32	  to,
   33	  layout = "grid",
   34	  onAdd,
   35	  className,
   36	}: Props) => {
   37	  const media = (
   38	    <div className={styles.media}>
   39	      {product.imageUrl ? (
   40	        <img
   41	          className={styles.image}
   42	          src={product.imageUrl}
   43	          alt={product.name}
   44	          loading="lazy"
   45	          decoding="async"
   46	        />
   47	      ) : (
   48	        <div className={styles.placeholder} aria-hidden="true">
   49	          <ImageOff size={22} />
   50	        </div>
   51	      )}
   52	      {product.featured && (
   53	        <Badge variant="warning" className={styles.featuredBadge}>
   54	          Featured
   55	        </Badge>
   56	      )}
   57	      {!product.available && (
   58	        <div className={styles.soldOut}>
   59	          <span>Out of stock</span>
   60	        </div>
   61	      )}
   62	    </div>
   63	  );
   64	
   65	  return (
   66	    <article
   67	      className={`${styles.card} ${layout === "row" ? styles.rowCard : ""} ${className ?? ""}`}
   68	    >
   69	      {to ? (
   70	        <Link to={to} className={styles.mediaLink} aria-label={product.name}>
   71	          {media}
   72	        </Link>
   73	      ) : (
   74	        media
   75	      )}
   76	
   77	      <div className={styles.body}>
   78	        <h3 className={styles.name}>
   79	          {to ? (
   80	            <Link to={to} className={styles.nameLink}>
   81	              {product.name}
   82	            </Link>
   83	          ) : (
   84	            product.name
   85	          )}
   86	        </h3>
   87	        {product.description && (
   88	          <p className={styles.description}>{product.description}</p>
   89	        )}
   90	        <div className={styles.footer}>
   91	          <span className={styles.price}>
   92	            {formatMoney(product.price, product.currency)}
   93	            {product.unit ? " / " + product.unit : ""}
   94	          </span>
   95	          <Button
   96	            size="sm"
   97	            variant={product.available ? "primary" : "outline"}
   98	            disabled={!product.available}
   99	            onClick={() => onAdd(product)}
  100	            aria-label={`Add ${product.name} to cart`}
  101	          >
  102	            <Plus size={15} />
  103	            Add
  104	          </Button>
  105	        </div>
  106	      </div>
  107	    </article>
  108	  );
  109	};
