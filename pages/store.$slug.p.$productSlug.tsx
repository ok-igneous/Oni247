import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { ArrowLeft, ImageOff, MessageCircle, Minus, Plus } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { formatMoney } from "../helpers/formatMoney";
import { buildWhatsAppOrderUrl } from "../helpers/buildWhatsAppOrderUrl";
   10	import { useStorefront } from "../helpers/useStorefront";
   11	import { trackStoreEvent } from "../helpers/trackStoreEvent";
   12	import { storeThemeEngine } from "../helpers/storeThemeEngine";
   13	import styles from "./store.$slug.p.$productSlug.module.css";
   14	
   15	const ProductDetailPage = () => {
   16	  const { slug, productSlug } = useParams<{
   17	    slug: string;
   18	    productSlug: string;
   19	  }>();
   20	  const { data, isFetching, error } = useStorefront(slug);
   21	  const [quantity,setQuantity]=useState(1);
   22	  useEffect(() => {
   23	    const product = data?.products.find((item) => item.slug === productSlug);
   24	    if (data?.business && product) trackStoreEvent("product_view", { businessSlug: data.business.slug, productSlug: product.slug });
   25	  }, [data, productSlug]);
   26	
   27	  if (isFetching && !data) {
   28	    return (
   29	      <div className={styles.page}>
   30	        <Skeleton className={styles.skeletonImage} />
   31	        <Skeleton className={styles.skeletonTitle} />
   32	        <Skeleton className={styles.skeletonLine} />
   33	      </div>
   34	    );
   35	  }
   36	
   37	  const product = data?.products.find((item) => item.slug === productSlug);
   38	
   39	  if (error || !data || !product) {
   40	    return (
   41	      <div className={styles.page}>
   42	        <h1 className={styles.notFoundTitle}>Item not found</h1>
   43	        <p className={styles.body}>
   44	          This item may have been removed or renamed.
   45	        </p>
   46	        {data && (
   47	          <Button asChild variant="outline">
   48	            <Link to={`/store/${data.business.slug}`}>
   49	              <ArrowLeft size={16} />
   50	              Back to the shop
   51	            </Link>
   52	          </Button>
   53	        )}
   54	      </div>
   55	    );
   56	  }
   57	
   58	  const business = data.business;
   59	  const appearance=business.appearanceSettings??{};
   60	  const theme=storeThemeEngine(business.themeId,appearance);
   61	  const homePage=typeof appearance.homePage==="string"?appearance.homePage:"home";
   62	  const footerMode=appearance.footerMode==="none"||appearance.footerMode==="selected"?appearance.footerMode:"all";
   63	  const footerPages=Array.isArray(appearance.footerPages)?appearance.footerPages.filter((x):x is string=>typeof x==="string"):[];
   64	  const showFooter=footerMode==="all"||(footerMode==="selected"&&footerPages.includes("product-detail"));
   65	  if (!business.canUseProductLinks) {
   66	    return (
   67	      <div className={styles.page}>
   68	        <h1 className={styles.notFoundTitle}>Product link unavailable</h1>
   69	        <p className={styles.body}>Direct product links are available on Premium. You can still browse this business from its main storefront.</p>
   70	        <Button asChild variant="outline"><Link to={"/store/" + business.slug}>Back to the shop</Link></Button>
   71	      </div>
   72	    );
   73	  }
   74	  const whatsappNumber = business.whatsappNumber ?? business.phone ?? "";
   75	  const orderUrl = buildWhatsAppOrderUrl({
   76	    businessName: business.name,
   77	    whatsappNumber,
   78	    currency: business.currency,
   79	    items: [{ name: product.name, quantity, unitPrice: product.price }],
   80	  });
   81	
   82	  const description =
   83	    product.description ?? `${product.name} from ${business.name}.`;
   84	
   85	  // Same category first, then anything else from the shop, to a maximum of four.
   86	  const sameCategory = data.products.filter(
   87	    (item) =>
   88	      item.id !== product.id &&
   89	      product.categoryId !== null &&
   90	      item.categoryId === product.categoryId,
   91	  );
   92	  const others = data.products.filter(
   93	    (item) => item.id !== product.id && !sameCategory.includes(item),
   94	  );
   95	  const related = [...sameCategory, ...others].slice(0, 4);
   96	  const categoryName =
   97	    data.categories.find((category) => category.id === product.categoryId)
   98	      ?.name ?? null;
   99	
  100	  return (
  101	    <div className={styles.page} style={theme.style as React.CSSProperties}>
  102	      <Helmet>
  103	        <title>{`${product.name} — ${business.name}`}</title>
  104	        <meta name="description" content={description} />
  105	        <meta
  106	          property="og:title"
  107	          content={`${product.name} — ${business.name}`}
  108	        />
  109	        <meta property="og:description" content={description} />
  110	        <meta property="og:type" content="product" />
  111	        {product.imageUrl && (
  112	          <meta property="og:image" content={product.imageUrl} />
  113	        )}
  114	      </Helmet>
  115	
  116	      <header className={styles.storeHeader}><Link to={homePage==="home"?`/store/${business.slug}`:`/store/${business.slug}/${homePage}`} className={styles.storeBrand}>{business.logoUrl&&<img src={business.logoUrl} alt=""/>}<span>{business.name}</span></Link><nav className={styles.storeNav}><Link to={homePage==="home"?`/store/${business.slug}`:`/store/${business.slug}/${homePage}`}>Home</Link><Link to={`/store/${business.slug}/products`}>Products</Link><Link to={`/store/${business.slug}/services`}>Services</Link><Link to={`/store/${business.slug}/about`}>About</Link><Link to={`/store/${business.slug}/contact`}>Contact</Link></nav></header>
  117	      <Link to={`/store/${business.slug}/products`} className={styles.back}>
  118	        <ArrowLeft size={16} />
  119	        {business.name}
  120	      </Link>
  121	
  122	      <div className={styles.layout}>
  123	        <div className={styles.media}>
  124	          {product.imageUrl ? (
  125	            <img
  126	              src={product.imageUrl}
  127	              alt={product.name}
  128	              className={styles.image}
  129	            />
  130	          ) : (
  131	            <div className={styles.placeholder}>
  132	              <ImageOff size={28} />
  133	            </div>
  134	          )}
  135	        </div>
  136	
  137	        <div className={styles.details}>
  138	          <div className={styles.badges}>
  139	            {product.featured && <Badge variant="warning">Featured</Badge>}
  140	            <Badge variant={product.available ? "success" : "secondary"}>
  141	              {product.available ? "In stock" : "Out of stock"}
  142	            </Badge>
  143	          </div>
  144	
  145	          <h1 className={styles.name}>{product.name}</h1>
  146	          <span className={styles.price}>
  147	            {formatMoney(product.price, product.currency)}
  148	            {product.unit ? " / " + product.unit : ""}
  149	          </span>
  150	
  151	          {product.variants && product.variants.length > 0 && (
  152	            <div className={styles.variantList}>
  153	              {product.variants.map((variant, index) => (
  154	                <div key={index} className={styles.variant}>
  155	                  <strong>{variant.name}:</strong> {variant.value}
  156	                  {variant.price != null ? " · " + formatMoney(variant.price, product.currency) : ""}
  157	                </div>
  158	              ))}
  159	            </div>
  160	          )}
  161	
  162	          {product.description && (
  163	            <p className={styles.body}>{product.description}</p>
  164	          )}
  165	
  166	          {product.available && <div className={styles.quantityRow}><span>Quantity</span><div className={styles.quantityControl}><Button type="button" variant="outline" size="icon-sm" aria-label="Decrease quantity" disabled={quantity<=1} onClick={()=>setQuantity(q=>Math.max(1,q-1))}><Minus size={14}/></Button><strong>{quantity}</strong><Button type="button" variant="outline" size="icon-sm" aria-label="Increase quantity" disabled={quantity>=99} onClick={()=>setQuantity(q=>Math.min(99,q+1))}><Plus size={14}/></Button></div><strong className={styles.lineTotal}>{formatMoney(product.price*quantity,product.currency)}</strong></div>}
  167	
  168	          <div className={styles.productActions}>{whatsappNumber && product.available && (
  169	            <Button asChild size="lg" className={styles.orderButton}>
  170	              <a href={orderUrl} target="_blank" rel="noopener noreferrer">
  171	                <MessageCircle size={17} />
  172	                Order on WhatsApp
  173	              </a>
  174	            </Button>
  175	          )}
  176	
  177	          {!product.available && (
  178	            <p className={styles.note}>
  179	              This item is not available right now. Message the shop to ask when
  180	              it is back.
  181	            </p>
  182	          )}
  183	
  184	          <Button asChild variant="outline">
  185	            <Link to={`/store/${business.slug}/products`}>
  186	              See everything else
  187	            </Link>
  188	          </Button>
  189	          </div>
  190	        </div>
  191	      </div>
  192	
  193	      {related.length > 0 && (
  194	        <section className={styles.related}>
  195	          <h2 className={styles.relatedHeading}>
  196	            {sameCategory.length > 0 && categoryName
  197	              ? `More in ${categoryName}`
  198	              : `More from ${business.name}`}
  199	          </h2>
  200	          <div className={styles.relatedGrid}>
  201	            {related.map((item) => (
  202	              <Link
  203	                key={item.id}
  204	                to={`/store/${business.slug}/p/${item.slug}`}
  205	                className={styles.relatedCard}
  206	              >
  207	                <div className={styles.relatedMedia}>
  208	                  {item.imageUrl ? (
  209	                    <img
  210	                      src={item.imageUrl}
  211	                      alt=""
  212	                      className={styles.relatedImage}
  213	                      loading="lazy"
  214	                      decoding="async"
  215	                    />
  216	                  ) : (
  217	                    <ImageOff size={18} className={styles.relatedIcon} />
  218	                  )}
  219	                  {!item.available && (
  220	                    <span className={styles.relatedSoldOut}>Out of stock</span>
  221	                  )}
  222	                </div>
  223	                <span className={styles.relatedName}>{item.name}</span>
  224	                <span className={styles.relatedPrice}>
  225	                  {formatMoney(item.price, item.currency)}
  226	                </span>
  227	              </Link>
  228	            ))}
  229	          </div>
  230	        </section>
  231	      )}
  232	      {showFooter&&<footer className={styles.storeFooter}><Link to={homePage==="home"?`/store/${business.slug}`:`/store/${business.slug}/${homePage}`}>Home</Link><span>© {new Date().getFullYear()} {business.name}</span></footer>}
  233	    </div>
  234	  );
  235	};
  236	
  237	export default ProductDetailPage;
