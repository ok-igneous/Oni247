import { useCallback, useEffect, useMemo, useState } from "react";

export type StoreCartItem = {
  productId: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  /** Chosen options, e.g. [{ name: "Size", value: "L" }]. */
  variants?: Array<{ name: string; value: string }>;
  /** "Size: L, Colour: Red" for display. */
  variantLabel?: string | null;
  /** Units in stock when the item was added. null/undefined = not tracked. */
  maxQuantity?: number | null;
};

export type StoreCartLine = StoreCartItem & {
  quantity: number;
  /** Unique per product + options, so "Size L" and "Size M" are separate lines. */
  lineId: string;
};

const storageKey = (slug: string) => `oniduka.cart.${slug}`;

const lineIdFor = (item: StoreCartItem): string => {
  const options = (item.variants ?? [])
    .map((pick) => `${pick.name}=${pick.value}`)
    .join("|");
  return options ? `${item.productId}::${options}` : item.productId;
};

const clampQuantity = (quantity: number, max: number | null | undefined): number => {
  const capped = Math.min(999, Math.max(0, Math.floor(quantity)));
  return typeof max === "number" ? Math.min(capped, max) : capped;
};

const readCart = (slug: string): StoreCartLine[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (line): line is StoreCartLine =>
          typeof line === "object" &&
          line !== null &&
          typeof (line as StoreCartLine).productId === "string" &&
          typeof (line as StoreCartLine).quantity === "number",
      )
      .map((line) => ({ ...line, lineId: line.lineId ?? lineIdFor(line) }));
  } catch {
    return [];
  }
};

/**
 * Client-side cart, scoped per business slug and persisted in the browser only.
 * No customer account, no server round-trip. Lines are keyed by product + chosen
 * options; carts saved before options existed keep working (their lineId is the
 * product id).
 */
export const useStoreCart = (slug: string) => {
  const [items, setItems] = useState<StoreCartLine[]>(() => readCart(slug));

  useEffect(() => {
    setItems(readCart(slug));
  }, [slug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey(slug), JSON.stringify(items));
    } catch {
      /* quota or private mode — the cart simply does not survive a reload */
    }
  }, [slug, items]);

  const add = useCallback((item: StoreCartItem, quantity: number = 1) => {
    const lineId = lineIdFor(item);
    setItems((current) => {
      const existing = current.find((line) => line.lineId === lineId);
      if (existing) {
        return current.map((line) =>
          line.lineId === lineId
            ? {
                ...line,
                // Take the latest price and stock the shopper saw.
                price: item.price,
                maxQuantity: item.maxQuantity,
                quantity: clampQuantity(line.quantity + quantity, item.maxQuantity),
              }
            : line,
        );
      }
      const next = clampQuantity(quantity, item.maxQuantity);
      if (next <= 0) return current;
      return [...current, { ...item, lineId, quantity: next }];
    });
  }, []);

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((line) => line.lineId !== lineId)
        : current.map((line) =>
            line.lineId === lineId
              ? { ...line, quantity: clampQuantity(quantity, line.maxQuantity) }
              : line,
          ),
    );
  }, []);

  const remove = useCallback((lineId: string) => {
    setItems((current) => current.filter((line) => line.lineId !== lineId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const { count, total } = useMemo(
    () =>
      items.reduce(
        (acc, line) => ({
          count: acc.count + line.quantity,
          total: acc.total + line.price * line.quantity,
        }),
        { count: 0, total: 0 },
      ),
    [items],
  );

  return { items, add, setQuantity, remove, clear, count, total };
};
  135