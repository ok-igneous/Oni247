"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShellNext } from "./AuthShell.next";
import { Input } from "../../../components/Input";
import { Button } from "../../../components/Button";
import { postResetPassword } from "../../../endpoints/auth/reset_password_POST.schema";

function ResetPasswordContentNext() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!message.startsWith("Password reset successfully")) return;
    const timeout = window.setTimeout(() => router.replace("/login"), 700);
    return () => window.clearTimeout(timeout);
  }, [message, router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    if (!token) {
      setMessage("This password reset link is invalid or incomplete.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const result = await postResetPassword({ token, password });
      setMessage(result.message || "Password reset successfully. Redirecting to login…");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShellNext title="Set a new password" subtitle="Choose a new password for your Oni247 account."
      footer={<Link href="/login">Back to login</Link>}>
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <Input type="password" value={password} onChange={event => setPassword(event.target.value)}
          placeholder="New password" required minLength={8} autoComplete="new-password" disabled={loading} />
        <Input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}
          placeholder="Confirm password" required minLength={8} autoComplete="new-password" disabled={loading} />
        <Button type="submit" disabled={loading || !token}>{loading ? "Saving…" : "Reset password"}</Button>
        {message && <p role="status">{message}</p>}
      </form>
    </AuthShellNext>
  );
}

export function ResetPasswordPageNext() {
  return <Suspense fallback={<AuthShellNext title="Set a new password" subtitle="Loading reset link…" footer={<Link href="/login">Back to login</Link>} />}>
    <ResetPasswordContentNext />
  </Suspense>;
}
