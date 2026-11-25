/** Rough minutes to read an HTML or plain-text post at 200 words a minute. */
export const readingTime = (content: string): number => {
  const words = content
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};
