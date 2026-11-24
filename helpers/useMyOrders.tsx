import { useCallback, useEffect, useState } from "react";

type SavedOrder = {
  code: string;
  slug: string;
  businessName: string;
  total: number;
  currency: string;
  placedAt: string;
};

const STORAGE_KEY = "oniduka.myOrders";
const MAX_SAVED = 30;

const read = (): SavedOrder[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedOrder =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as SavedOrder).code === "string" &&
        typeof (item as SavedOrder).slug === "string",
    );
  } catch {
    return [];
  }
};

/**
 * Remembers the tracking codes this browser has placed, so a customer with no
 * account can still find their orders. Local to the device — nothing is sent
 * anywhere, and clearing browser data clears it.
 */
export const useMyOrders = (slug?: string) => {
  const [orders, setOrders] = useState<SavedOrder[]>([]);

  useEffect(() => {
    setOrders(read());
  }, []);

  const persist = useCallback((next: SavedOrder[]) => {
    setOrders(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode — the list simply does not survive */
    }
  }, []);

  const remember = useCallback(
    (order: SavedOrder) => {
      const existing = read().filter((item) => item.code !== order.code);
      persist([order, ...existing].slice(0, MAX_SAVED));
    },
    [persist],
  );

  const forget = useCallback(
    (code: string) => {
      persist(read().filter((item) => item.code !== code));
    },
    [persist],
  );

  const forThisShop = slug
    ? orders.filter((order) => order.slug === slug)
    : orders;

  return { orders, forThisShop, remember, forget };
};