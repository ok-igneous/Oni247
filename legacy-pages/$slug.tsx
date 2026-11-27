/**
 * Public business storefront vanity route: /{businessSlug}.
 *
 * Reuse the shared storefront implementation so theme, content, cart,
 * analytics and order behavior stay consistent at the canonical root URL.
 * Static platform routes such as /login and /dashboard remain separate.
 */
import StorePage from "./store.$slug";

export default function BusinessVanityPage() {
  return <StorePage />;
}
