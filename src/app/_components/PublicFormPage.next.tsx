"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getPublicForm } from "../../../endpoints/forms/public_GET.schema";
import { postSubmitForm } from "../../../endpoints/forms/submit_POST.schema";
import type { Field } from "../../../endpoints/forms/save_POST.schema";
import styles from "./public-form.module.css";

export default function PublicFormPage({ slug, formId }: { slug: string; formId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-form", slug, formId],
    queryFn: () => getPublicForm(slug, formId),
    retry: false,
  });
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const update = (field: Field, value: unknown) => {
    setAnswers((current) => ({ ...current, [field.id]: value }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await postSubmitForm({ slug, formId, answers });
      setMessage(result.message || data.form.successMessage);
      setSubmitted(true);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not submit this form. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <main className={styles.page}><div className={styles.card} aria-busy="true">Loading form…</div></main>;
  if (error || !data) return <main className={styles.page}><div className={styles.card}><h1>Form unavailable</h1><p>This form may have been removed, closed or is no longer available.</p><Link href={`/${slug}`}>Return to business page</Link></div></main>;

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Link href={`/${slug}`} className={styles.business}>
          {data.business.logoUrl ? <img src={data.business.logoUrl} alt="" /> : null}
          <span>{data.business.name}</span>
        </Link>
        {submitted ? (
          <section className={styles.success} role="status">
            <h1>Response received</h1>
            <p>{message || data.form.successMessage}</p>
            <Link href={`/${slug}`}>Return to {data.business.name}</Link>
          </section>
        ) : (
          <>
            <header className={styles.heading}>
              <h1>{data.form.title}</h1>
              {data.form.description && <p>{data.form.description}</p>}
            </header>
            <form className={styles.form} onSubmit={submit}>
              {data.form.fields.map((field) => (
                <label className={styles.field} key={field.id}>
                  <span>{field.label}{field.required ? " *" : ""}</span>
                  {field.type === "textarea" ? (
                    <textarea required={field.required} maxLength={2000} value={String(answers[field.id] ?? "")} onChange={(event) => update(field, event.target.value)} rows={5} />
                  ) : field.type === "select" ? (
                    <select required={field.required} value={String(answers[field.id] ?? "")} onChange={(event) => update(field, event.target.value)}>
                      <option value="">Choose an option</option>
                      {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <span className={styles.checkbox}><input type="checkbox" checked={answers[field.id] === true} onChange={(event) => update(field, event.target.checked)} /> Yes</span>
                  ) : (
                    <input
                      type={field.type === "phone" ? "tel" : field.type}
                      required={field.required}
                      maxLength={2000}
                      value={String(answers[field.id] ?? "")}
                      onChange={(event) => update(field, event.target.value)}
                    />
                  )}
                </label>
              ))}
              {message && <p className={styles.error} role="alert">{message}</p>}
              <button type="submit" disabled={busy}>{busy ? "Submitting…" : data.form.submitLabel || "Submit"}</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
