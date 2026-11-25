import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, FileText, Search } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import { readingTime } from "../helpers/readingTime";
import type { BlogSettings } from "../helpers/parseBlogSettings";
import styles from "./BlogList.module.css";

export type BlogListPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  content: string;
  publishedAt: Date | string | null;
};

interface Props {
  posts: BlogListPost[];
  settings: BlogSettings;
  businessSlug: string;
}

/** The public blog list. Layout and what each card shows come from Blog settings. */
export const BlogList = ({ posts, settings, businessSlug }: Props) => {
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(settings.postsPerPage);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return posts;
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(term) ||
        (post.excerpt ?? "").toLowerCase().includes(term),
    );
  }, [posts, search]);

  const shown = filtered.slice(0, visible);
  const featured = settings.layout === "magazine" || settings.featureFirst ? shown[0] : null;
  const rest = featured ? shown.slice(1) : shown;
  const gridLike = settings.layout !== "list";

  const card = (post: BlogListPost, big = false) => {
    const href = `/${businessSlug}/b/${post.slug}`;
    return (
      <article key={post.id} className={`${styles.card} ${big ? styles.big : ""} ${!gridLike && !big ? styles.row : ""}`}>
        {settings.showCover && (
          <Link to={href} className={styles.media} tabIndex={-1} aria-hidden="true">
            {post.coverImageUrl ? (
              <img src={post.coverImageUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className={styles.placeholder}><FileText size={26} /></span>
            )}
          </Link>
        )}
        <div className={styles.body}>
          {(settings.showDate || settings.showReadTime) && (
            <div className={styles.meta}>
              {settings.showDate && post.publishedAt && (
                <time dateTime={new Date(post.publishedAt).toISOString()}>
                  {new Date(post.publishedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </time>
              )}
              {settings.showReadTime && (
                <span className={styles.read}><Clock size={13} aria-hidden="true" /> {readingTime(post.content)} min read</span>
              )}
            </div>
          )}
          <h2 className={styles.title}><Link to={href}>{post.title}</Link></h2>
          {settings.showExcerpt && post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
          <Link to={href} className={styles.more}>Read article →</Link>
        </div>
      </article>
    );
  };

  return (
    <div className={styles.wrap}>
      {posts.length > 1 && (
        <div className={styles.searchWrap}>
          <Search size={18} className={styles.searchIcon} aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisible(settings.postsPerPage);
            }}
            placeholder="Search articles"
            aria-label="Search articles"
            className={styles.search}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className={styles.empty}>
          {posts.length === 0 ? "No articles have been published yet." : "No article matches your search."}
        </p>
      ) : (
        <>
          {featured && card(featured, true)}
          <div className={gridLike ? styles.grid : styles.list}>{rest.map((post) => card(post))}</div>
          {filtered.length > visible && (
            <div className={styles.moreRow}>
              <Button variant="outline" onClick={() => setVisible((count) => count + settings.postsPerPage)}>
                Show more articles ({filtered.length - visible} left)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
