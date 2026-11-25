/**
 * Short summary for blog cards: the written excerpt when there is one,
 * otherwise the first words of the post body with the formatting stripped.
 */
export const summariseBlogContent = (
  excerpt: string | null | undefined,
  content: string,
  maxLength = 180,
): string => {
  const written = excerpt?.trim();
  if (written) return written;

  const plain = content
    .replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[#*_>`~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;
  const cut = plain.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};
