"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../../../components/Button";
import { postUnsubscribe } from "../../../endpoints/email/unsubscribe_POST.schema";
import styles from "../../../pages/unsubscribe.module.css";

function UnsubscribeContentNext() {
  const params = useSearchParams();
  const token = params.get("t") ?? "";
  const [state, setState] = useState<"idle" | "working" | "done" | "failed">("idle");

  const confirm = async () => {
    if (!token || state === "working") return;
    setState("working");
    try {
      await postUnsubscribe(token);
      setState("done");
    } catch {
      setState("failed");
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        {state === "done" ? <>
          <h1>You're unsubscribed</h1>
          <p>You won't get any more emails from this business.</p>
        </> : <>
          <h1>Unsubscribe from emails</h1>
          <p>Press the button and you will stop receiving emails from this business.</p>
          {state === "failed" && <p role="alert">Something went wrong. Please try again.</p>}
          <Button onClick={() => void confirm()} disabled={!token || state === "working"}>
            {state === "working" ? "Unsubscribing…" : "Unsubscribe"}
          </Button>
        </>}
      </div>
    </main>
  );
}

export function UnsubscribePageNext() {
  return <Suspense fallback={<main className={styles.page}><div className={styles.card}><p>Loading unsubscribe link…</p></div></main>}>
    <UnsubscribeContentNext />
  </Suspense>;
}
