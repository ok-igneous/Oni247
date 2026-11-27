import { notFound } from "next/navigation";

/** /store/{slug} was never the canonical Oni247 URL and must stay unavailable. */
export default function RemovedStoreRoute() {
  notFound();
}
