/**
 * URL-safe slug from a business or product name. Pure, no dependencies.
 */
export const toSlug = (input: string): string =>
  input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
   10	    .replace(/^-+|-+$/g, "")
   11	    .slice(0, 60);
