export type OutputType = string;
export const getSitemap = async (init?: RequestInit): Promise<string> => {
  const result = await fetch("/_api/sitemap", { method: "GET", ...init });
  if (!result.ok) throw new Error("Could not load sitemap.");
  return result.text();
};
