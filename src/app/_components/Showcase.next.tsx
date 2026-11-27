"use client";

import Link from "next/link";
import { ImageOff, MessageCircle, Store } from "lucide-react";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { formatMoney } from "../../../helpers/formatMoney";
import { buildWhatsAppOrderUrl } from "../../../helpers/buildWhatsAppOrderUrl";
import type { OutputType } from "../../../endpoints/showcase_GET.schema";
import styles from "./Showcase.next.module.css";

type Props = { data: OutputType };

export default function ShowcaseNext({ data }: Props) {
  const { showcase, business, products } = data;
  const whatsapp = business.whatsappNumber ?? business.phone ?? "";
  const shareDescription = showcase.description ?? `${products.length} picks from ${business.name}.`;

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <Link href={`/${encodeURIComponent(business.slug)}`} className={styles.shopLink}>
          {business.logoUrl ? <img src={business.logoUrl} alt="" className={styles.logo} /> : <Store size={15} />}
          {business.name}
        </Link>
        <h1 className={styles.title}>{showcase.title}</h1>
        {showcase.description && <p className={styles.body}>{showcase.description}</p>}
      </header>

      {products.length === 0 ? (
        <p className={styles.body}>There are no products in this collection yet.</p>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <Link key={product.id} href={`/${encodeURIComponent(business.slug)}/p/${encodeURIComponent(product.slug)}`} className={styles.card}>
              <div className={styles.media}>
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt="" className={styles.image} loading="lazy" />
                ) : (
                  <ImageOff size={20} className={styles.icon} />
                )}
                {!product.available && <Badge variant="secondary" className={styles.soldOut}>Out of stock</Badge>}
              </div>
              <span className={styles.name}>{product.name}</span>
              <span className={styles.price}>{formatMoney(product.price, product.currency)}</span>
            </Link>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <Button asChild size="lg"><Link href={`/${encodeURIComponent(business.slug)}`}>See the full shop</Link></Button>
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
              <MessageCircle size={17} /> Ask on WhatsApp
            </a>
          </Button>
        )}
      </div>
    </main>
  );
}
