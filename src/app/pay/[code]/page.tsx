import type { Metadata } from "next";
import PayPage from "../../_components/PayPage.next";

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ ref?: string | string[] }> };
export const metadata: Metadata = { title: "Pay online — Oni247", robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }: Props) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const ref = Array.isArray(query.ref) ? query.ref[0] : query.ref ?? null;
  return <PayPage code={code} ref={ref} />;
}
