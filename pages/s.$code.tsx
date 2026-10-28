import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { ImageOff, MessageCircle, Store } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { formatMoney } from "../helpers/formatMoney";
import { buildWhatsAppOrderUrl } from "../helpers/buildWhatsAppOrderUrl";
   10	import { getShowcase } from "../endpoints/showcase_GET.schema";
   11	import styles from "./s.$code.module.css";
   12	
   13	const ShowcasePage = () => {
   14	  const { code } = useParams<{ code: string }>();
   15	  const { data, isFetching, error } = useQuery({
   16	    queryKey: ["showcase", code],
   17	    queryFn: () => getShowcase({ code: code as string }),
   18	    enabled: Boolean(code),
   19	    retry: false,
   20	  });
   21	
   22	  if (isFetching && !data) {
   23	    return (
   24	      <div className={styles.page}>
   25	        <Skeleton className={styles.skeletonTitle} />
   26	        <div className={styles.grid}>
   27	          {[0, 1, 2, 3].map((index) => (
   28	            <Skeleton key={index} className={styles.skeletonCard} />
   29	          ))}
   30	        </div>
   31	      </div>
   32	    );
   33	  }
   34	
   35	  if (error || !data) {
   36	    return (
   37	      <div className={styles.page}>
   38	        <h1 className={styles.title}>Collection not found</h1>
   39	        <p className={styles.body}>
   40	          This link may have been removed, or the shop is not published.
   41	        </p>
   42	      </div>
   43	    );
   44	  }
   45	
   46	  const { showcase, business, products } = data;
   47	  const whatsapp = business.whatsappNumber ?? business.phone ?? "";
   48	  const shareDescription =
   49	    showcase.description ?? `${products.length} picks from ${business.name}.`;
   50	
   51	  return (
   52	    <div className={styles.page}>
   53	      <Helmet>
   54	        <title>{`${showcase.title} — ${business.name}`}</title>
   55	        <meta name="description" content={shareDescription} />
   56	        <meta property="og:title" content={showcase.title} />
   57	        <meta property="og:description" content={shareDescription} />
   58	        <meta property="og:type" content="website" />
   59	        {products[0]?.imageUrl && (
   60	          <meta property="og:image" content={products[0].imageUrl} />
   61	        )}
   62	      </Helmet>
   63	
   64	      <header className={styles.head}>
   65	        <Link to={`/store/${business.slug}`} className={styles.shopLink}>
   66	          {business.logoUrl ? (
   67	            <img src={business.logoUrl} alt="" className={styles.logo} />
   68	          ) : (
   69	            <Store size={15} />
   70	          )}
   71	          {business.name}
   72	        </Link>
   73	        <h1 className={styles.title}>{showcase.title}</h1>
   74	        {showcase.description && (
   75	          <p className={styles.body}>{showcase.description}</p>
   76	        )}
   77	      </header>
   78	
   79	      <div className={styles.grid}>
   80	        {products.map((product) => (
   81	          <Link
   82	            key={product.id}
   83	            to={`/store/${business.slug}/p/${product.slug}`}
   84	            className={styles.card}
   85	          >
   86	            <div className={styles.media}>
   87	              {product.imageUrl ? (
   88	                <img
   89	                  src={product.imageUrl}
   90	                  alt=""
   91	                  className={styles.image}
   92	                  loading="lazy"
   93	                />
   94	              ) : (
   95	                <ImageOff size={20} className={styles.icon} />
   96	              )}
   97	              {!product.available && (
   98	                <Badge variant="secondary" className={styles.soldOut}>
   99	                  Out of stock
  100	                </Badge>
  101	              )}
  102	            </div>
  103	            <span className={styles.name}>{product.name}</span>
  104	            <span className={styles.price}>
  105	              {formatMoney(product.price, product.currency)}
  106	            </span>
  107	          </Link>
  108	        ))}
  109	      </div>
  110	
  111	      <div className={styles.actions}>
  112	        <Button asChild size="lg">
  113	          <Link to={`/store/${business.slug}`}>See the full shop</Link>
  114	        </Button>
  115	        {whatsapp && (
  116	          <Button asChild variant="outline" size="lg">
  117	            <a
  118	              href={buildWhatsAppOrderUrl({
  119	                businessName: business.name,
  120	                whatsappNumber: whatsapp,
  121	                currency: business.currency,
  122	                items: [],
  123	                note: `I saw your "${showcase.title}" collection.`,
  124	              })}
  125	              target="_blank"
  126	              rel="noopener noreferrer"
  127	            >
  128	              <MessageCircle size={17} />
  129	              Ask on WhatsApp
  130	            </a>
  131	          </Button>
  132	        )}
  133	      </div>
  134	    </div>
  135	  );
  136	};
  137	
  138	export default ShowcasePage;
