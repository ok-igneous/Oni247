import type { Metadata } from "next";
import { UnsubscribePageNext } from "../_components/Unsubscribe.next";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

export default function UnsubscribePage() {
  return <UnsubscribePageNext />;
}
