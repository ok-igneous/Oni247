/**
 * Public business vanity URL: /{businessSlug}
 *
 * Reuse the canonical storefront implementation so the vanity URL has the
 * same theme, content, cart, analytics, and order behavior as /store/{slug}.
 * Static routes such as /login and /dashboard remain more specific routes.
 */
import StorePage from "./store.$slug";

   10	export default function BusinessVanityPage() {
   11	  return <StorePage />;
   12	}