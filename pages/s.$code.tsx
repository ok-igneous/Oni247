import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { ImageOff, MessageCircle, Store } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { formatMoney } from "../helpers/formatMoney";
import { buildWhatsAppOrderUrl } from "../helpers/buildWhatsAppOrderUrl";
import { useStorefrontHost } from "../helpers/storefrontHost";
import { getShowcase } from "../endpoints/showcase_GET.schema";
import styles from "./s.$code.module.css";

const ShowcasePage = () => {
  const { code } = useParams<{ code: string }>();
  const host = useStorefrontHost();
  const { data, isFetching, error } = useQuery({
    queryKey: ["showcase", code],
    queryFn: () => getShowcase({ code: code as string }),
    enabled: Boolean(code),
    retry: false,
  });

  if (isFetching && !data) {
    return (
      <div className={styles.page}>
        <Skeleton className={styles.skeletonTitle} />
        <div className={styles.grid}>
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Collection not found</h1>
        <p className={styles.body}>
          This link may have been removed, or the shop is not published.
        </p>
      </div>
    );
  }

  const { showcase, business, products } = data;
  const businessPath = host.slug === business.slug ? "" : `/${business.slug}`;
  const whatsapp = business.whatsappNumber ?? business.phone ?? "";
  const shareDescription =
    showcase.description ?? `${products.length} picks from ${business.name}.`;

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{`${showcase.title} — ${business.name}`}</title>
        <meta name="description" content={shareDescription} />
        <meta property="og:title" content={showcase.title} />
        <meta property="og:description" content={shareDescription} />
        <meta property="og:type" content="website" />
        {products[0]?.imageUrl && (
          <meta property="og:image" content={products[0].imageUrl} />
        )}
      </Helmet>

      <header className={styles.head}>
        <Link to={businessPath || "/"} className={styles.shopLink}>
          {business.logoUrl ? (
            <img src={business.logoUrl} alt="" className={styles.logo} />
          ) : (
            <Store size={15} />
          )}
          {business.name}
        </Link>
        <h1 className={styles.title}>{showcase.title}</h1>
        {showcase.description && (
          <p className={styles.body}>{showcase.description}</p>
        )}
      </header>

      <div className={styles.grid}>
        {products.map((product) => (
          <Link
            key={product.id}
            to={`${businessPath}/p/${product.slug}`}
            className={styles.card}
          >
            <div className={styles.media}>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt=""
                  className={styles.image}
                  loading="lazy"
                />
              ) : (
                <ImageOff size={20} className={styles.icon} />
              )}
              {!product.available && (
                <Badge variant="secondary" className={styles.soldOut}>
                  Out of stock
                </Badge>
              )}
            </div>
            <span className={styles.name}>{product.name}</span>
            <span className={styles.price}>
              {formatMoney(product.price, product.currency)}
            </span>
          </Link>
        ))}
      </div>

      <div className={styles.actions}>
        <Button asChild size="lg">
          <Link to={businessPath || "/"}>See the full shop</Link>
        </Button>
        {whatsapp && (
          <Button asChild variant="outline" size="lg">
            <a
              href={buildWhatsAppOrderUrl({
                businessName: business.name,
                whatsappNumber: whatsapp,
                currency: business.currency,
                items: [],
                note: `I saw your "${showcase.title}" collection.`,
              })}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={17} />
              Ask on WhatsApp
            </a>
          </Button>
        )}
      </div>
    </div>
  );
};

export default ShowcasePage;
