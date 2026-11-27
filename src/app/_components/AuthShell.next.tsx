import type { ReactNode } from "react";
import Link from "next/link";
import styles from "../../../components/AuthShell.module.css";

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShellNext({ title, subtitle, children, footer }: Props) {
  return (
    <main className={styles.wrap}>
      <section className={styles.card}>
        <Link href="/" className={styles.brand}>Oni247</Link>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        <div className={styles.body}>{children}</div>
        <div className={styles.footer}>{footer}</div>
      </section>
    </main>
  );
}
