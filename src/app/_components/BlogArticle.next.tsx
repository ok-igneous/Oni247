"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { EngagementSection } from "../../../components/EngagementSection";
import { storeThemeEngine } from "../../../helpers/storeThemeEngine";
import type { OutputType } from "../../../endpoints/storefront_GET.schema";
import { StorefrontHeaderNext } from "./StorefrontHeader.next";
import styles from "./store.$slug.b.$blogSlug.module.css";

type Props = {
  data: OutputType;
  blogSlug: string;
  customDomain: boolean;
  origin: string;
  safeContent: string;
};

export default function BlogArticleNext({ data, blogSlug, customDomain, origin, safeContent }: Props) {
  const business = data.business;
  const post = data.blogPosts.find((item) => item.slug === blogSlug);
  const path = customDomain
    ? `/b/${encodeURIComponent(blogSlug)}`
    : `/${encodeURIComponent(business.slug)}/b/${encodeURIComponent(blogSlug)}`;
  const homePage = typeof business.appearanceSettings?.homePage === "string"
    ? business.appearanceSettings.homePage
    : "home";
  const home = customDomain
    ? (homePage === "home" ? "/" : `/${homePage}`)
    : (homePage === "home" ? `/${encodeURIComponent(business.slug)}` : `/${encodeURIComponent(business.slug)}/${homePage}`);

  if (!post) {
    return (
      <main className={styles.content}>
        <h1>Article not found</h1>
        <p>This article may have been removed or is no longer published.</p>
        <Link href={customDomain ? "/blog" : `/${encodeURIComponent(business.slug)}/blog`}>Back to blog</Link>
      </main>
    );
  }

  const appearance = business.appearanceSettings ?? {};
  const theme = storeThemeEngine(business.themeId, appearance);
  const footerMode = appearance.footerMode === "none" || appearance.footerMode === "selected"
    ? appearance.footerMode
    : "all";
  const footerPages = Array.isArray(appearance.footerPages)
    ? appearance.footerPages.filter((value): value is string => typeof value === "string")
    : [];
  const showFooter = footerMode === "all" || (footerMode === "selected" && footerPages.includes("blog-detail"));
  const canonicalUrl = new URL(path, origin).toString();
  const shareUrl = new URL(`/_api/share/page?slug=${encodeURIComponent(business.slug)}&kind=blog&id=${encodeURIComponent(post.slug)}`, origin).toString();
  const share = () => {
    if (navigator.share) {
      void navigator.share({ title: `${post.title} — ${business.name}`, url: shareUrl }).catch(() => {});
    } else if (navigator.clipboard) {
      void navigator.clipboard.writeText(shareUrl).then(
        () => toast.success("Article link copied."),
        () => toast.error("Could not copy the link."),
      );
    }
  };
  const plainText = safeContent.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  const readingMinutes = Math.max(1, Math.ceil(plainText.trim().split(/\s+/).filter(Boolean).length / 200));
  const description = (post.excerpt || post.title).slice(0, 200);
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || post.title,
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    datePublished: post.publishedAt,
    author: { "@type": "Organization", name: business.name },
    publisher: {
      "@type": "Organization",
      name: business.name,
      logo: business.logoUrl ? { "@type": "ImageObject", url: business.logoUrl } : undefined,
    },
    mainEntityOfPage: canonicalUrl,
  }).replace(/</g, "\\u003c");

  return (
    <div className={styles.site} style={theme.style as React.CSSProperties}>
      <StorefrontHeaderNext
        businessName={business.name}
        logoUrl={business.logoUrl}
        tagline={typeof appearance.headerTagline === "string" ? appearance.headerTagline : ""}
        headerBrand={typeof appearance.headerBrand === "string" ? appearance.headerBrand : "logo_name"}
        headerAlignment={theme.headerAlignment}
        menuStyle={theme.menuStyle as "bar" | "minimal" | "pills"}
        menuPosition={theme.menuPosition as "left" | "center" | "right"}
        menuVisibility={theme.menuVisibility as "always" | "auto"}
        navItems={[
          { label: "Home", href: home },
          { label: "Products", href: customDomain ? "/products" : `/${business.slug}/products` },
          ...(data.services.length ? [{ label: "Services", href: customDomain ? "/services" : `/${business.slug}/services` }] : []),
          { label: "Blog", href: customDomain ? "/blog" : `/${business.slug}/blog`, active: true },
          ...(data.events.length && appearance.eventsPageInMenu === true
            ? [{ label: "Events", href: customDomain ? "/events" : `/${business.slug}/events` }]
            : []),
          { label: "Contact", href: customDomain ? "/contact" : `/${business.slug}/contact` },
        ]}
      />
      <main className={styles.content}>
        <Link className={styles.back} href={customDomain ? "/blog" : `/${business.slug}/blog`}>
          <ArrowLeft size={16} /> All articles
        </Link>
        {post.coverImageUrl && <img className={styles.cover} src={post.coverImageUrl} alt={post.title} />}
        <p className={styles.eyebrow}>{business.name} · Article</p>
        <h1>{post.title}</h1>
        <p className={styles.metaRow}>
          {post.publishedAt && (
            <time dateTime={new Date(post.publishedAt).toISOString()}>
              {new Date(post.publishedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
            </time>
          )}
          <span>{readingMinutes} min read</span>
        </p>
        {post.excerpt && !post.autoExcerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
        <article className={styles.article} dangerouslySetInnerHTML={{ __html: safeContent }} />
        <EngagementSection slug={business.slug} targetType="blog" targetId={post.id} contextTitle={post.title} />
        <button className={styles.share} onClick={share} type="button">Share article</button>
      </main>
      {showFooter && (
        <footer className={styles.footer}>
          <Link href={home}>{business.name}</Link>
        </footer>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </div>
  );
}
