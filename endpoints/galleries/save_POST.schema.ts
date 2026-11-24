import { z } from "zod";
import superjson from "superjson";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v && v.length ? v : null));

/**
 * Uploaded images are stored as site-relative paths (/_cdn/...), so a strict
 * `.url()` check wrongly rejects them. Accept uploaded paths and full links.
 */
const assetUrl = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (value) => /^(https?:\/\/|\/)/i.test(value),
    "This image is missing or was not uploaded properly. Please upload it again.",
  );

const image = z.object({
  id: z.string().uuid().nullish(),
  imageUrl: assetUrl,
  caption: text(300),
  altText: text(180),
  tag: text(80),
  sortOrder: z.number().int().min(0).max(9999),
});

export const schema = z.object({
  id: z.string().uuid().nullish(),
  name: z.string().trim().min(1, "Give the gallery a name").max(100),
  description: text(500),
  slug: z
    .string()
    .trim()
    .min(1, "The gallery needs a page address")
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and hyphens only in the page address",
    ),
  coverImageUrl: assetUrl.nullish(),
  published: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
  images: z.array(image).max(200, "A gallery can hold up to 200 photos"),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { saved: true };

export const postSaveGallery = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const v = schema.parse(body);
  const r = await fetch("/_api/galleries/save", {
    method: "POST",
    body: superjson.stringify(v),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!r.ok) {
    const e = superjson.parse<{ error: string }>(await r.text());
    throw new Error(e.error);
  }
  return superjson.parse<OutputType>(await r.text());
};

