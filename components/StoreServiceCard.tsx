import { Link } from "react-router-dom";
import { Badge } from "./Badge";
import { Button } from "./Button";
import type { StorefrontService } from "../endpoints/storefront_GET.schema";
import styles from "./StoreServiceCard.module.css";

type Props = { service: StorefrontService; businessSlug: string; compact?: boolean };

export const StoreServiceCard = ({ service, businessSlug, compact = false }: Props) => (
  <article className={`${styles.card} ${compact ? styles.compact : ""}`}>
    {service.imageUrl && <img className={styles.image} src={service.imageUrl} alt={service.name} loading="lazy" decoding="async" />}
    <div className={styles.body}>
      <div className={styles.heading}><h3>{service.name}</h3>{service.featured && <Badge>Featured</Badge>}</div>
      {service.description && <p className={styles.description}>{service.description}</p>}
      <div className={styles.meta}>
        <strong>{service.priceType === "contact" ? "Contact for price" : service.priceType === "starting" ? `From ${service.price}` : service.price}</strong>
        {service.duration && <span>{service.duration}</span>}
      </div>
      <Button asChild size="sm"><Link to={`/${businessSlug}/s/${service.id}`}>{service.cta === "call" ? "View service & call" : service.cta === "whatsapp" ? "View service & WhatsApp" : "View service & enquire"}</Link></Button>
    </div>
  </article>
);