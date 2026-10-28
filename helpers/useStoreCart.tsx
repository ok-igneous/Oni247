import { useCallback, useEffect, useMemo, useState } from "react";

export type StoreCartItem = {
  productId: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string | null;
};
   10	
   11	type StoredLine = StoreCartItem & { quantity: number };
   12	
   13	const storageKey = (slug: string) => `oniduka.cart.${slug}`;
   14	
   15	const readCart = (slug: string): StoredLine[] => {
   16	  if (typeof window === "undefined") return [];
   17	  try {
   18	    const raw = window.localStorage.getItem(storageKey(slug));
   19	    if (!raw) return [];
   20	    const parsed: unknown = JSON.parse(raw);
   21	    if (!Array.isArray(parsed)) return [];
   22	    return parsed.filter(
   23	      (line): line is StoredLine =>
   24	        typeof line === "object" &&
   25	        line !== null &&
   26	        typeof (line as StoredLine).productId === "string" &&
   27	        typeof (line as StoredLine).quantity === "number",
   28	    );
   29	  } catch {
   30	    return [];
   31	  }
   32	};
   33	
   34	/**
   35	 * Client-side cart, scoped per business slug and persisted in the browser only.
   36	 * No customer account, no server round-trip.
   37	 */
   38	export const useStoreCart = (slug: string) => {
   39	  const [items, setItems] = useState<StoredLine[]>(() => readCart(slug));
   40	
   41	  useEffect(() => {
   42	    setItems(readCart(slug));
   43	  }, [slug]);
   44	
   45	  useEffect(() => {
   46	    if (typeof window === "undefined") return;
   47	    try {
   48	      window.localStorage.setItem(storageKey(slug), JSON.stringify(items));
   49	    } catch {
   50	      /* quota or private mode — the cart simply does not survive a reload */
   51	    }
   52	  }, [slug, items]);
   53	
   54	  const add = useCallback((item: StoreCartItem, quantity: number = 1) => {
   55	    setItems((current) => {
   56	      const existing = current.find((line) => line.productId === item.productId);
   57	      if (existing) {
   58	        return current.map((line) =>
   59	          line.productId === item.productId
   60	            ? { ...line, quantity: line.quantity + quantity }
   61	            : line,
   62	        );
   63	      }
   64	      return [...current, { ...item, quantity }];
   65	    });
   66	  }, []);
   67	
   68	  const setQuantity = useCallback((productId: string, quantity: number) => {
   69	    setItems((current) =>
   70	      quantity <= 0
   71	        ? current.filter((line) => line.productId !== productId)
   72	        : current.map((line) =>
   73	            line.productId === productId ? { ...line, quantity } : line,
   74	          ),
   75	    );
   76	  }, []);
   77	
   78	  const remove = useCallback((productId: string) => {
   79	    setItems((current) => current.filter((line) => line.productId !== productId));
   80	  }, []);
   81	
   82	  const clear = useCallback(() => setItems([]), []);
   83	
   84	  const { count, total } = useMemo(
   85	    () =>
   86	      items.reduce(
   87	        (acc, line) => ({
   88	          count: acc.count + line.quantity,
   89	          total: acc.total + line.price * line.quantity,
   90	        }),
   91	        { count: 0, total: 0 },
   92	      ),
   93	    [items],
   94	  );
   95	
   96	  return { items, add, setQuantity, remove, clear, count, total };
   97	};
