import { escapeHtml } from "./storefrontPrerender";

export function storefrontSnapshot(data: any, pathname: string, origin: string, customDomain = false, canonicalPath = pathname): { title: string; description: string; body: string; image?: string; jsonLd?: unknown } {
  const business = data.business;
  const base = customDomain ? origin : `${origin}/${encodeURIComponent(business.slug)}`;
  const pathSegments = pathname.split("/").filter(Boolean);
  const segments = customDomain ? pathSegments : pathSegments.slice(1);
  const [kind, contentSlug] = segments;
  const links = (data.products ?? []).filter((item: any) => item.available).map((item: any) =>
    `<li><a href="${base}/p/${encodeURIComponent(item.slug)}">${escapeHtml(item.name)}</a>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</li>`).join("");
  const intro = business.description ? `<p>${escapeHtml(business.description)}</p>` : "";
  const image = business.heroImageUrl || business.logoUrl;
  if (!kind) {
    return {
      title: `${business.name} — Oni247`,
      description: business.description || `Explore products and services from ${business.name}.`,
      image: image || undefined,
      body: `<main><h1>${escapeHtml(business.name)}</h1>${intro}${business.heroHeadline ? `<h2>${escapeHtml(business.heroHeadline)}</h2>` : ""}${business.heroSubtext ? `<p>${escapeHtml(business.heroSubtext)}</p>` : ""}${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(business.name)}" />` : ""}<h2>Products</h2><ul>${links}</ul><p><a href="${base}/products">Browse products</a> · <a href="${base}/contact">Contact ${escapeHtml(business.name)}</a></p></main>`,
      jsonLd: { "@context": "https://schema.org", "@type": "Store", name: business.name, url: base, description: business.description || undefined, image: image || undefined },
    };
  }
  if (kind === "p") {
    const product = (data.products ?? []).find((item: any) => item.slug === contentSlug && item.available);
    if (!product || !business.canUseProductLinks) throw new Error("Public product not found");
    const description = product.description || `${product.name} from ${business.name}.`;
    return {
      title: `${product.name} — ${business.name}`,
      description,
      image: product.imageUrl || undefined,
      body: `<main><nav><a href="${base}">${escapeHtml(business.name)}</a> / <a href="${base}/products">Products</a></nav><h1>${escapeHtml(product.name)}</h1>${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" />` : ""}<p>${escapeHtml(description)}</p><p>${escapeHtml(product.currency)} ${escapeHtml(product.price)}</p><p><a href="${base}/products">Browse more products</a></p></main>`,
      jsonLd: { "@context": "https://schema.org", "@type": "Product", name: product.name, description, image: product.imageUrl ? [product.imageUrl] : undefined, offers: { "@type": "Offer", priceCurrency: product.currency, price: product.price, availability: "https://schema.org/InStock" } },
    };
  }
  if (kind === "b") {
    const post = (data.blogPosts ?? []).find((item: any) => item.slug === contentSlug);
    if (!post) throw new Error("Public article not found");
    const description = post.excerpt || post.title;
    return {
      title: `${post.title} — ${business.name}`,
      description,
      image: post.coverImageUrl || undefined,
      body: `<main><nav><a href="${base}">${escapeHtml(business.name)}</a> / <a href="${base}/blog">Blog</a></nav><article><h1>${escapeHtml(post.title)}</h1>${post.coverImageUrl ? `<img src="${escapeHtml(post.coverImageUrl)}" alt="${escapeHtml(post.title)}" />` : ""}<p>${escapeHtml(description)}</p><div>${post.content ?? ""}</div></article></main>`,
      jsonLd: { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description, datePublished: post.publishedAt || undefined, image: post.coverImageUrl ? [post.coverImageUrl] : undefined, author: { "@type": "Organization", name: business.name }, mainEntityOfPage: `${origin}${canonicalPath}` },
    };
  }
  if (kind === "e") {
    const event = (data.events ?? []).find((item: any) => item.slug === contentSlug);
    if (!event) throw new Error("Public event not found");
    return {
      title: `${event.title} — ${business.name}`,
      description: event.description || `Event hosted by ${business.name}.`,
      image: event.coverImageUrl || undefined,
      body: `<main><nav><a href="${base}">${escapeHtml(business.name)}</a> / <a href="${base}/events">Events</a></nav><article><h1>${escapeHtml(event.title)}</h1>${event.coverImageUrl ? `<img src="${escapeHtml(event.coverImageUrl)}" alt="${escapeHtml(event.title)}" />` : ""}<p>${escapeHtml(event.description)}</p><p>${escapeHtml(event.startsAt)}${event.endsAt ? ` – ${escapeHtml(event.endsAt)}` : ""}</p>${event.venue ? `<p>${escapeHtml(event.venue)}</p>` : ""}</article></main>`,
      jsonLd: { "@context": "https://schema.org", "@type": "Event", name: event.title, description: event.description, startDate: event.startsAt, endDate: event.endsAt || undefined, location: event.venue ? { "@type": "Place", name: event.venue } : undefined, image: event.coverImageUrl ? [event.coverImageUrl] : undefined, organizer: { "@type": "Organization", name: business.name }, url: `${origin}${pathname}` },
    };
  }
  const pageTitles: Record<string, string> = { products: "Products", services: "Services", about: "About", gallery: "Gallery", blog: "Blog", events: "Events", contact: "Contact" };
  const pageTitle = pageTitles[kind];
  if (!pageTitle || !business.canUseMultiPage) throw new Error("Public page not found");
  const body = kind === "blog"
    ? (data.blogPosts ?? []).map((post: any) => `<li><a href="${base}/b/${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a><p>${escapeHtml(post.excerpt || "")}</p></li>`).join("")
    : kind === "events"
      ? (data.events ?? []).map((event: any) => `<li><a href="${base}/e/${encodeURIComponent(event.slug)}">${escapeHtml(event.title)}</a><p>${escapeHtml(event.description)}</p></li>`).join("")
      : kind === "services"
        ? (data.services ?? []).map((service: any) => `<li><h2>${escapeHtml(service.name)}</h2><p>${escapeHtml(service.description)}</p></li>`).join("")
        : kind === "about" ? intro
          : kind === "products" ? links
            : `<p>Visit ${escapeHtml(business.name)} for more information.</p>`;
  return {
    title: `${pageTitle} — ${business.name}`,
    description: business.description || `${pageTitle} from ${business.name}.`,
    body: `<main><nav><a href="${base}">${escapeHtml(business.name)}</a></nav><h1>${escapeHtml(pageTitle)}</h1>${kind === "products" || kind === "services" || kind === "blog" || kind === "events" ? `<ul>${body}</ul>` : body}</main>`,
    jsonLd: { "@context": "https://schema.org", "@type": "WebPage", name: `${pageTitle} — ${business.name}`, url: `${origin}${canonicalPath}`, isPartOf: { "@type": "WebSite", name: business.name, url: base } },
  };
}
