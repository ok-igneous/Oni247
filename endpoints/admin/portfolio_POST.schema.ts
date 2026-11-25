import { z } from "zod";
import superjson from "superjson";
const item = z.object({ title: z.string().max(120), text: z.string().max(1500), category: z.string().max(160), imageUrl: z.string().max(1000), linkUrl: z.string().max(1000) });
export const schema = z.object({ portfolio: z.object({
  name: z.string().max(120), headline: z.string().max(220), eyebrow: z.string().max(120), intro: z.string().max(1200), availability: z.string().max(120), profileImageUrl: z.string().max(1000),
  aboutTitle: z.string().max(220), aboutOne: z.string().max(2000), aboutTwo: z.string().max(2000), approachTitle: z.string().max(220), approachText: z.string().max(1000), location: z.string().max(120), meta: z.array(z.string().max(120)).max(6),
  services: z.array(item).max(30), projects: z.array(item).max(30), contactTitle: z.string().max(220), contactText: z.string().max(1200), phone: z.string().max(40), email: z.string().max(180), seoTitle: z.string().max(70), seoDescription: z.string().max(200),
}) });
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };
export const postAdminPortfolio = async (body: InputType): Promise<OutputType> => {
  const response = await fetch("/_api/admin/portfolio", { method: "POST", body: superjson.stringify(schema.parse(body)), headers: { "Content-Type": "application/json" } });
  if (!response.ok) { const result = superjson.parse<{ error: string }>(await response.text()); throw new Error(result.error); }
  return superjson.parse<OutputType>(await response.text());
};
