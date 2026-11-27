import { storefrontPath } from "../helpers/storefrontPath";
import { useStorefrontRouteParams } from "../helpers/storefrontHost";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { ArrowLeft } from "lucide-react";
import { useStorefront } from "../helpers/useStorefront";
import { storeThemeEngine } from "../helpers/storeThemeEngine";
import { readingTime } from "../helpers/readingTime";
import styles from "./store.$slug.b.$blogSlug.module.css";
import { StorefrontHeader } from "../components/StorefrontHeader";
import { EngagementSection } from "../components/EngagementSection";
import { toast } from "sonner";
import { shareLink } from "../endpoints/share/page_GET.schema";

export default function BlogArticlePage() {
  const { slug, blogSlug } = useStorefrontRouteParams<{ slug: string; blogSlug: string }>();
  const { data, isFetching, error } = useStorefront(slug);
  if (isFetching && !data) return <main className={styles.page}><p>Loading article…</p></main>;
  const business = data?.business;
  const post = data?.blogPosts.find((item) => item.slug === blogSlug);
  if (error || !data || !business || !post) {
    return (
      <main className={styles.content}>
        <h1>Article not found</h1>
        <p>This article may have been removed or is no longer published.</p>
        {data && <Link to={storefrontPath(data.business.slug, "/blog")}>Back to blog</Link>}
      </main>
    );
  }

  const theme = storeThemeEngine(business.themeId, business.appearanceSettings ?? {});
  const appearance = business.appearanceSettings ?? {};
  const homePage = typeof appearance.homePage === "string" ? appearance.homePage : "home";
  const footerMode = appearance.footerMode === "none" || appearance.footerMode === "selected" ? appearance.footerMode : "all";
  const footerPages = Array.isArray(appearance.footerPages)
    ? appearance.footerPages.filter((x): x is string => typeof x === "string")
    : [];
  const showFooter = footerMode === "all" || (footerMode === "selected" && footerPages.includes("blog-detail"));
  const url = shareLink(business.slug, "blog", post.slug);
  const share = () => {
    if (navigator.share) void navigator.share({ title: `${post.title} — ${business.name}`, url }).catch(() => {});
    else if (navigator.clipboard) void navigator.clipboard.writeText(url).then(() => toast.success("Article link copied."), () => toast.error("Could not copy the link."));
  };
  const home = homePage === "home" ? storefrontPath(business.slug) : storefrontPath(business.slug, "/" + homePage);

  return (
    <div className={styles.site} style={theme.style as React.CSSProperties}>
      <Helmet>
        <title>{`${post.title} — ${business.name}`}</title>
        <meta name="description" content={(post.excerpt || post.title).slice(0, 160)} />
        <link rel="canonical" href={window.location.origin + window.location.pathname} />
        <meta property="og:url" content={window.location.origin + window.location.pathname} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${post.title} — ${business.name}`} />
        <meta property="og:description" content={(post.excerpt || post.title).slice(0, 200)} />
        {post.coverImageUrl && <meta property="og:image" content={post.coverImageUrl} />}
        <meta name="twitter:card" content={post.coverImageUrl ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={`${post.title} — ${business.name}`} />
        <meta name="twitter:description" content={(post.excerpt || post.title).slice(0, 200)} />
        {post.coverImageUrl && <meta name="twitter:image" content={post.coverImageUrl} />}
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt || post.title,
          image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
          datePublished: post.publishedAt,
          author: { "@type": "Organization", name: business.name },
          publisher: { "@type": "Organization", name: business.name, logo: business.logoUrl ? { "@type": "ImageObject", url: business.logoUrl } : undefined },
          mainEntityOfPage: window.location.origin + window.location.pathname,
        }).replace(/</g, "\\u003c")}</script>
      </Helmet>
      <StorefrontHeader
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
          { label: "Products", href: storefrontPath(business.slug, "/products") },
          ...(data.services.length ? [{ label: "Services", href: storefrontPath(business.slug, "/services") }] : []),
          { label: "Blog", href: storefrontPath(business.slug, "/blog"), active: true },
          ...(data.events.length && appearance.eventsPageInMenu === true
            ? [{ label: "Events", href: storefrontPath(business.slug, "/events") }]
            : []),
          { label: "Contact", href: storefrontPath(business.slug, "/contact") },
        ]}
      />
      <main className={styles.content}>
        <Link className={styles.back} to={storefrontPath(business.slug, "/blog")}>
          <ArrowLeft size={16} /> All articles
        </Link>
        {post.coverImageUrl && <img className={styles.cover} src={post.coverImageUrl} alt={post.title} />}
        <p className={styles.eyebrow}>{business.name} · Article</p>
        <h1>{post.title}</h1>
        <p className={styles.metaRow}>
          {post.publishedAt && (
            <time>
              {new Date(post.publishedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
            </time>
          )}
          <span>{readingTime(post.content)} min read</span>
        </p>
        {post.excerpt && !post.autoExcerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
        <article className={styles.article} dangerouslySetInnerHTML={{ __html: post.content }} />
        <EngagementSection slug={business.slug} targetType="blog" targetId={post.id} contextTitle={post.title} />
        <button className={styles.share} onClick={share} type="button">Share article</button>
      </main>
      {showFooter && (
        <footer className={styles.footer}>
          <Link to={home}>{business.name}</Link>
        </footer>
      )}
    </div>
  );
}

