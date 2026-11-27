/**
 * Public business vanity URL: /{businessSlug}
 *
 * Reuse the canonical storefront implementation so the vanity URL has the
 * same theme, content, cart, analytics, and order behavior as the shared storefront component.
 * Static routes such as /login and /dashboard remain more specific routes.
 */
import StorePage from "./store.$slug";

export default function BusinessVanityPage() {
  return <StorePage />;
}
