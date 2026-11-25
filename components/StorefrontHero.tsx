import { MessageCircle } from "lucide-react";
import { Button } from "./Button";
import styles from "./StorefrontHero.module.css";

type Props = {
  headline?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  layout?: "full" | "left" | "right" | "text";
  actionUrl?: string;
  actionLabel?: string;
  className?: string;
  style?: React.CSSProperties;
};

export const StorefrontHero = ({ headline, description, imageUrl, layout = "right", actionUrl, actionLabel = "Contact us", className, style }: Props) => {
  if (!headline && !description && !imageUrl) return null;
  return (
    <section className={`${styles.hero} ${styles[`hero_${layout}`]} ${className ?? ""}`} style={style} aria-label="Business introduction">
      {imageUrl && layout !== "text" && <img className={styles.image} src={imageUrl} alt="" fetchPriority="high" decoding="async" />}
      <div className={styles.content}>
        {headline && <h1 className={styles.headline}>{headline}</h1>}
        {description && <p className={styles.description}>{description}</p>}
        {actionUrl && <Button asChild size="lg"><a href={actionUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={17}/>{actionLabel}</a></Button>}
      </div>
    </section>
  );
};
