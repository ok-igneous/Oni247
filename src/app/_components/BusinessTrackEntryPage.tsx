"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/Input";
import { useStorefront } from "../../../helpers/useStorefront";
import styles from "./track-order.module.css";

/** Business-scoped order tracking entry: /{businessSlug}/track */
export default function BusinessTrackEntryPage({ slug }: { slug: string }) {
  const { data, isFetching } = useStorefront(slug);
  const [code, setCode] = useState("");
  const router = useRouter();
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = code.trim().replace(/\s+/g, "");
    if (clean) router.push(`/${slug}/track/${encodeURIComponent(clean)}`);
  };
  return <main className={styles.page}>
    <Link href={`/${slug}`}><ArrowLeft size={15}/> {data?.business.name ?? "Back to shop"}</Link>
    <h1 className={styles.title}>Track your order</h1>
    <p className={styles.body}>{isFetching ? "Loading shop…" : `Enter the tracking code supplied by ${data?.business.name ?? "this business"}.`}</p>
    <form onSubmit={submit}>
      <Input value={code} onChange={event => setCode(event.target.value)} placeholder="Order tracking code" aria-label="Order tracking code" required />
      <Button type="submit" disabled={!code.trim()}><Search size={16}/> Find order</Button>
    </form>
  </main>;
}
