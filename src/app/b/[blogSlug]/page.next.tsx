import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { sanitizeBlogContent } from "../../../helpers/sanitizeBlogContent";
import BlogArticleNext from "../../_components/BlogArticle.next";
import { getStorefrontData, resolveStorefrontHost, storefrontMetadata } from "../../_lib/storefront.server";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ blogSlug: string }> };

async function getPageData(params: Props["params"]) {
  const [{ blogSlug }, requestHeaders] = await Promise.all([params, headers()]);
  const host = requestHeaders.get("host") ?? "";
  const resolved = await resolveStorefrontHost(host);
  if (resolved.platformHost || !resolved.slug) notFound();
  const data = await getStorefrontData(resolved.slug);
  const post = data?.blogPosts.find((item) => item.slug === blogSlug);
  if (!data || !post) notFound();
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const origin = host ? `${protocol}://${host}` : "https://oni247.org";
  const canonical = new URL(`/b/${encodeURIComponent(blogSlug)}`, origin).toString();
  return { data, blogSlug, origin, canonical, post };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data, post, canonical } = await getPageData(params);
  const description = (post.excerpt || post.title).slice(0, 200);
  return {
    ...storefrontMetadata(data, canonical),
    title: `${post.title} — ${data.business.name}`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: `${post.title} — ${data.business.name}`,
      description,
      url: canonical,
      siteName: data.business.name,
      ...(post.coverImageUrl ? { images: [{ url: post.coverImageUrl }] } : {}),
      ...(post.publishedAt ? { publishedTime: new Date(post.publishedAt).toISOString() } : {}),
    },
    twitter: {
      card: post.coverImageUrl ? "summary_large_image" : "summary",
      title: `${post.title} — ${data.business.name}`,
      description,
      ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}),
    },
  };
}

export default async function CustomDomainBlogArticlePage({ params }: Props) {
  const { data, blogSlug, origin } = await getPageData(params);
  return <BlogArticleNext data={data} blogSlug={blogSlug} customDomain origin={origin} safeContent={sanitizeBlogContent(data.blogPosts.find((post) => post.slug === blogSlug)?.content ?? "")} />;
}
