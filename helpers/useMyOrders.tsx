import { useCallback, useEffect, useState } from "react";

type SavedOrder = {
  code: string;
  slug: string;
  businessName: string;
  total: number;
  currency: string;
  placedAt: string;
   10	};
   11	
   12	const STORAGE_KEY = "oniduka.myOrders";
   13	const MAX_SAVED = 30;
   14	
   15	const read = (): SavedOrder[] => {
   16	  if (typeof window === "undefined") return [];
   17	  try {
   18	    const raw = window.localStorage.getItem(STORAGE_KEY);
   19	    if (!raw) return [];
   20	    const parsed: unknown = JSON.parse(raw);
   21	    if (!Array.isArray(parsed)) return [];
   22	    return parsed.filter(
   23	      (item): item is SavedOrder =>
   24	        typeof item === "object" &&
   25	        item !== null &&
   26	        typeof (item as SavedOrder).code === "string" &&
   27	        typeof (item as SavedOrder).slug === "string",
   28	    );
   29	  } catch {
   30	    return [];
   31	  }
   32	};
   33	
   34	/**
   35	 * Remembers the tracking codes this browser has placed, so a customer with no
   36	 * account can still find their orders. Local to the device — nothing is sent
   37	 * anywhere, and clearing browser data clears it.
   38	 */
   39	export const useMyOrders = (slug?: string) => {
   40	  const [orders, setOrders] = useState<SavedOrder[]>([]);
   41	
   42	  useEffect(() => {
   43	    setOrders(read());
   44	  }, []);
   45	
   46	  const persist = useCallback((next: SavedOrder[]) => {
   47	    setOrders(next);
   48	    try {
   49	      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
   50	    } catch {
   51	      /* private mode — the list simply does not survive */
   52	    }
   53	  }, []);
   54	
   55	  const remember = useCallback(
   56	    (order: SavedOrder) => {
   57	      const existing = read().filter((item) => item.code !== order.code);
   58	      persist([order, ...existing].slice(0, MAX_SAVED));
   59	    },
   60	    [persist],
   61	  );
   62	
   63	  const forget = useCallback(
   64	    (code: string) => {
   65	      persist(read().filter((item) => item.code !== code));
   66	    },
   67	    [persist],
   68	  );
   69	
   70	  const forThisShop = slug
   71	    ? orders.filter((order) => order.slug === slug)
   72	    : orders;
   73	
   74	  return { orders, forThisShop, remember, forget };
   75	};
