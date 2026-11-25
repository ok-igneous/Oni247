/**
 * Public vanity URL: /{businessSlug}/checkout
 * Shares the canonical checkout so cart, delivery and payment behave the same
 * on /store/{slug}/checkout and on the shop's own address.
 */
import CheckoutPage from "./store.$slug.checkout";

export default function BusinessCheckoutPage() {
  return <CheckoutPage />;
}
