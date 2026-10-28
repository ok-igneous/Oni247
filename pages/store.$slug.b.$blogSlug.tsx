import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { ArrowLeft } from "lucide-react";
import { useStorefront } from "../helpers/useStorefront";
import { storeThemeEngine } from "../helpers/storeThemeEngine";
import styles from "./store.$slug.b.$blogSlug.module.css";

export default function BlogArticlePage() {
  const { slug, blogSlug } = useParams<{ slug: string; blogSlug: string }>();
   10	  const { data, isFetching, error } = useStorefront(slug);
   11	  if (isFetching && !data) return <main className={styles.page}><p>Loading article…</p></main>;
   12	  const business = data?.business;
   13	  const post = data?.blogPosts.find((item) => item.slug === blogSlug);
   14	  if (error || !data || !business || !post) return <main className={styles.page}><h1>Article not found</h1><p>This article may have been removed or is no longer published.</p>{data && <Link to={`/store/${data.business.slug}/blog`}>Back to blog</Link>}</main>;
   15	  const theme = storeThemeEngine(business.themeId, business.appearanceSettings ?? {});
   16	  const appearance=business.appearanceSettings??{};
   17	  const homePage=typeof appearance.homePage==="string"?appearance.homePage:"home";
   18	  const footerMode=appearance.footerMode==="none"||appearance.footerMode==="selected"?appearance.footerMode:"all";
   19	  const footerPages=Array.isArray(appearance.footerPages)?appearance.footerPages.filter((x):x is string=>typeof x==="string"):[];
   20	  const showFooter=footerMode==="all"||(footerMode==="selected"&&footerPages.includes("blog-detail"));
   21	  const url = typeof window !== "undefined" ? window.location.href : `/store/${business.slug}/b/${post.slug}`;
   22	  const share = () => { if (navigator.share) void navigator.share({ title: `${post.title} — ${business.name}`, url }).catch(() => {}); else if (navigator.clipboard) void navigator.clipboard.writeText(url); };
   23	  return <div className={styles.site} style={theme.style as React.CSSProperties}><Helmet><title>{post.title} — {business.name}</title><meta name="description" content={post.excerpt || post.title}/><meta property="og:title" content={`${post.title} — ${business.name}`}/><meta property="og:description" content={post.excerpt || post.title}/>{post.coverImageUrl && <meta property="og:image" content={post.coverImageUrl}/>}</Helmet>
   24	    <header className={styles.header}><Link to={homePage==="home"?`/store/${business.slug}`:`/store/${business.slug}/${homePage}`} className={styles.brand}>{business.logoUrl && <img src={business.logoUrl} alt=""/>}<span><strong>{business.name}</strong>{typeof appearance.headerTagline === "string" && <small>{appearance.headerTagline}</small>}</span></Link><nav className={styles.nav}><Link to={homePage==="home"?`/store/${business.slug}`:`/store/${business.slug}/${homePage}`}>Home</Link><Link to={`/store/${business.slug}/products`}>Products</Link><Link to={`/store/${business.slug}/services`}>Services</Link><Link to={`/store/${business.slug}/blog`}>Blog</Link><Link to={`/store/${business.slug}/contact`}>Contact</Link></nav></header>
   25	    <main className={styles.content}><Link className={styles.back} to={`/store/${business.slug}/blog`}><ArrowLeft size={16}/> All articles</Link>{post.coverImageUrl && <img className={styles.cover} src={post.coverImageUrl} alt={post.title}/>}<p className={styles.eyebrow}>{business.name} · Article</p><h1>{post.title}</h1>{post.publishedAt && <p className={styles.date}>{new Date(post.publishedAt).toLocaleDateString()}</p>}{post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}<article className={styles.article} dangerouslySetInnerHTML={{__html:post.content}}/><button className={styles.share} onClick={share} type="button">Share article</button></main>{showFooter&&<footer className={styles.footer}><Link to={homePage==="home"?`/store/${business.slug}`:`/store/${business.slug}/${homePage}`}>{business.name}</Link></footer>}
   26	  </div>;
   27	}
