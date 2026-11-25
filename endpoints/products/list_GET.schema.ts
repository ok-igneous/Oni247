import superjson from "superjson";

export type OwnerProduct = {
  id: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  costPrice: number | null;
  currency: string;
  imageUrl: string | null;
  available: boolean;
  featured: boolean;
  sortOrder: number;
  unit: string | null;
  variants: Array<{ name: string; value: string; price: number | null }>;
  /** null = stock is not tracked for this product. */
  stockQuantity: number | null;
  images: string[];
  compareAtPrice: number | null;
};

export type OutputType = {
  products: OwnerProduct[];
};

export const getProducts = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/products/list`, {
    method: "GET",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
