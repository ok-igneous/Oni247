import Link from "next/link";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import type { StorefrontService } from "../../../endpoints/storefront_GET.schema";
import styles from "../../../components/StoreServiceCard.module.css";

type Props = { service: StorefrontService; businessSlug: string; compact?: boolean; customDomain?: boolean };

export const StoreServiceCardNext = ({ service, businessSlug, compact = false, customDomain = false }: Props) => (
  <article className={`${styles.card} ${compact ? styles.compact : ""}`}>
    {service.imageUrl && <img className={styles.image} src={service.imageUrl} alt={service.name} loading="lazy" decoding="async" />}
    <div className={styles.body}>
      <div className={styles.heading}><h3>{service.name}</h3>{service.featured && <Badge>Featured</Badge>}</div>
      {service.description && <p className={styles.description}>{service.description}</p>}
      <div className={styles.meta}>
        <strong>{service.priceType === "contact" ? "Contact for price" : service.priceType === "starting" ? `From ${service.price}` : service.price}</strong>
        {service.duration && <span>{service.duration}</span>}
      </div>
      <Button asChild size="sm"><Link href={customDomain ? `/s/${service.id}` : `/${businessSlug}/s/${service.id}`}>{service.cta === "call" ? "View service & call" : service.cta === "whatsapp" ? "View service & WhatsApp" : "View service & enquire"}</Link></Button>
    </div>
  </article>
);