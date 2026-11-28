"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../../../components/Button";
import { postUnsubscribe } from "../../../endpoints/email/unsubscribe_POST.schema";
import styles from "./unsubscribe.module.css";

// Unsubscribing is a button press, never page load: mail scanners open links.
export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const [state, setState] = useState<"idle" | "working" | "done" | "failed">("idle");

  const confirm = async () => {
    setState("working");
    try {
      await postUnsubscribe(token);
      setState("done");
    } catch {
      setState("failed");
    }
  };

  return (
    <div className={styles.page}>
      
      <div className={styles.card}>
        {state === "done" ? (
          <>
            <h1>You're unsubscribed</h1>
            <p>You won't get any more emails from this business.</p>
          </>
        ) : (
          <>
            <h1>Unsubscribe from emails</h1>
            <p>Press the button and you will stop receiving emails from this business.</p>
            {state === "failed" && <p>Something went wrong. Please try again.</p>}
            <Button onClick={() => void confirm()} disabled={!token || state === "working"}>
              {state === "working" ? "Unsubscribing…" : "Unsubscribe"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
