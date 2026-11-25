import { z } from "zod";
import superjson from "superjson";
export const schema = z.object({ contentType: z.enum(["image/png", "image/jpeg", "image/webp"]), sizeBytes: z.number().int().positive().max(3 * 1024 * 1024), fileName: z.string().trim().min(1).max(100) });
export type InputType = z.infer<typeof schema>;
export type OutputType = { presignedUrl: string; url: string };
export const postAdminPortfolioUpload = async (body: InputType): Promise<OutputType> => {
  const response = await fetch("/_api/admin/portfolioUpload", { method: "POST", body: superjson.stringify(schema.parse(body)), headers: { "Content-Type": "application/json" } });
  if (!response.ok) { const result = superjson.parse<{ error: string }>(await response.text()); throw new Error(result.error); }
  return superjson.parse<OutputType>(await response.text());
};
