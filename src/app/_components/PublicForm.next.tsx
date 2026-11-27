"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/Input";
import { Textarea } from "../../../components/Textarea";
import { getPublicForm, type OutputType as PublicForm } from "../../../endpoints/forms/public_GET.schema";
import { postSubmitForm } from "../../../endpoints/forms/submit_POST.schema";
import styles from "../../../pages/store.$slug.e.$eventSlug.module.css";

export default function PublicFormNext({ slug, formId, customDomain = false }: { slug: string; formId: string; customDomain?: boolean }) {
  const [data, setData] = useState<PublicForm | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void getPublicForm(slug, formId).then((value) => { if (active) setData(value); }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Form unavailable");
    });
    return () => { active = false; };
  }, [slug, formId]);
  const submit = async () => {
    if (!data || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await postSubmitForm({ slug, formId, answers });
      setMessage(result.message || data.form.successMessage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit form");
    } finally {
      setBusy(false);
    }
  };
  const home = customDomain ? "/" : `/${encodeURIComponent(slug)}`;
  if (error && !data) return <main className={styles.page}><h1>Form unavailable</h1><p>{error}</p><Link href={home}>Return to business page</Link></main>;
  if (!data) return <main className={styles.page}><p>Loading form…</p></main>;
  const appearance = data.business.appearanceSettings ?? {};
  const footerMode = appearance.footerMode === "none" || appearance.footerMode === "selected" ? appearance.footerMode : "all";
  const footerPages = Array.isArray(appearance.footerPages) ? appearance.footerPages.filter((item): item is string => typeof item === "string") : [];
  const showFooter = footerMode === "all" || (footerMode === "selected" && footerPages.includes("form-detail"));
  return <main className={styles.page}>
    <header className={styles.header}>
      {data.business.logoUrl && <img src={data.business.logoUrl} alt="" />}
      <strong>{data.business.name}</strong>
      <Link href={home}>Visit website</Link>
    </header>
    <section className={styles.content}>
      <p className={styles.eyebrow}>FORM</p>
      <h1>{data.form.title}</h1>
      {data.form.description && <p>{data.form.description}</p>}
      {message ? <p role="status">{message}</p> : <div className={styles.form}>
        {data.form.fields.map((field) => <label key={field.id}>{field.label}
          {field.type === "textarea" ? <Textarea rows={4} required={field.required} value={String(answers[field.id] ?? "")} onChange={(event) => setAnswers((current) => ({ ...current, [field.id]: event.target.value }))} />
            : field.type === "select" ? <select required={field.required} value={String(answers[field.id] ?? "")} onChange={(event) => setAnswers((current) => ({ ...current, [field.id]: event.target.value }))}><option value="">Choose…</option>{(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select>
            : field.type === "checkbox" ? <input type="checkbox" checked={answers[field.id] === true} onChange={(event) => setAnswers((current) => ({ ...current, [field.id]: event.target.checked }))} />
            : <Input type={field.type === "phone" ? "tel" : field.type} required={field.required} value={String(answers[field.id] ?? "")} onChange={(event) => setAnswers((current) => ({ ...current, [field.id]: event.target.value }))} />}
        </label>)}
        {error && <p role="alert">{error}</p>}
        <Button disabled={busy} onClick={() => void submit()}>{busy ? "Submitting…" : data.form.submitLabel}</Button>
      </div>}
    </section>
    {showFooter && <footer className={styles.footer}>© {new Date().getFullYear()} {data.business.name}</footer>}
  </main>;
}
