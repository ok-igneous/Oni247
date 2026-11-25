import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../helpers/trackStoreEvent";

/** Counts each public shop page once when it opens. Dashboard and admin pages are ignored. */
export const PageViewTracker = () => {
  const location = useLocation();
  const last = useRef("");
  useEffect(() => {
    const key = location.pathname;
    if (last.current === key) return;
    last.current = key;
    trackPageView(key);
  }, [location.pathname]);
  return null;
};
   17