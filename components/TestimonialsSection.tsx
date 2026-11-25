import { Star } from "lucide-react";
import type { TestimonialConfig } from "../helpers/testimonialConfig";
import styles from "./TestimonialsSection.module.css";

export type TestimonialItem = {
  id: string;
  authorName: string;
  authorRole?: string | null;
  quote: string;
  rating: number | null;
  imageUrl?: string | null;
};

const Rating = ({ value }: { value: number }) => (
  <div className={styles.rating} aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={14} className={n <= value ? styles.starOn : styles.starOff} />
    ))}
  </div>
);

export const TestimonialsSection = ({ items, config }: { items: TestimonialItem[]; config: TestimonialConfig }) => {
  const limit = config.testimonialMax === "all" ? items.length : Number(config.testimonialMax);
  const shown = items.slice(0, limit);
  const { testimonialLayout: layout, testimonialStyle: look, testimonialRating, testimonialPhotos } = config;

  if (layout === "gallery") {
    return (
      <div className={styles.gallery} data-cols={config.testimonialColumns}>
        {shown.map((item) => {
          const hasPhoto = testimonialPhotos && !!item.imageUrl;
          return (
            <figure key={item.id} className={`${styles.tile} ${hasPhoto ? styles.tilePhoto : styles.tileText}`}>
              {hasPhoto && <img src={item.imageUrl ?? ""} alt={item.authorName} loading="lazy" decoding="async" className={styles.tileImg} />}
              <div className={hasPhoto ? styles.tileOverlay : styles.tileBody}>
                {testimonialRating && item.rating !== null && <Rating value={item.rating} />}
                <blockquote className={styles.tileQuote}>{item.quote}</blockquote>
                <figcaption className={styles.tileCaption}>
                  {item.authorName}
                  {item.authorRole && <span>{item.authorRole}</span>}
                </figcaption>
              </div>
            </figure>
          );
        })}
      </div>
    );
  }

  return (
    <div className={layout === "slider" ? styles.slider : styles.grid} data-cols={config.testimonialColumns}>
      {shown.map((item) => (
        <figure key={item.id} className={`${styles.item} ${look === "quote" ? styles.styleQuote : look === "minimal" ? styles.minimal : styles.card}`}>
          {testimonialPhotos && item.imageUrl && <img src={item.imageUrl} alt={item.authorName} loading="lazy" decoding="async" className={styles.photo} />}
          {testimonialRating && item.rating !== null && <Rating value={item.rating} />}
          <blockquote className={styles.quote}>{item.quote}</blockquote>
          <figcaption className={styles.attribution}>
            {item.authorName}
            {item.authorRole && <span className={styles.authorRole}>{item.authorRole}</span>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
};
