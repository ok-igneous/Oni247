"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { AuthShellNext } from "./AuthShell.next";
import { Input } from "../../../components/Input";
import { Button } from "../../../components/Button";
import { Spinner } from "../../../components/Spinner";
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
  useForm,
} from "../../../components/Form";
import { useAuth, AUTH_QUERY_KEY } from "../../../helpers/useAuth";
import { LoginAttemptError, schema as loginSchema, postLogin } from "../../../endpoints/auth/login_with_password_POST.schema";
import { schema as registerSchema, postRegister } from "../../../endpoints/auth/register_with_password_POST.schema";
import { postForgotPassword } from "../../../endpoints/auth/forgot_password_POST.schema";
import { postSendVerification } from "../../../endpoints/auth/send_verification_POST.schema";
import { postVerifyEmail } from "../../../endpoints/auth/verify_email_POST.schema";
import loginStyles from "../../../components/PasswordLoginForm.module.css";
import registerStyles from "../../../components/PasswordRegisterForm.module.css";

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

function LoginFormNext() {
  const router = useRouter();
  const { onLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number | null>(null);
  const [requestCount, setRequestCount] = useState<number | null>(null);
  const [requestLimit, setRequestLimit] = useState<number | null>(null);
  const [requestsRemaining, setRequestsRemaining] = useState<number | null>(null);
  const [retryType, setRetryType] = useState<"IP_RATE_LIMITED" | "PASSWORD_LOCKOUT" | null>(null);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const form = useForm({ defaultValues: { email: "", password: "" }, schema: loginSchema });

  useEffect(() => {
    const saved = Number(window.localStorage.getItem("oni247-login-retry-at"));
    if (Number.isFinite(saved) && saved > Date.now()) {
      setRetryAt(saved);
      const savedType = window.localStorage.getItem("oni247-login-retry-type");
      if (savedType === "IP_RATE_LIMITED") {
        setRetryType("IP_RATE_LIMITED");
        setRequestCount(Number(window.localStorage.getItem("oni247-login-request-count")) || null);
        setRequestLimit(Number(window.localStorage.getItem("oni247-login-request-limit")) || null);
        setRequestsRemaining(Number(window.localStorage.getItem("oni247-login-requests-remaining")) || 0);
        setError("Too many login requests. Your login is temporarily paused.");
      } else {
        setRetryType("PASSWORD_LOCKOUT");
        setFailedAttempts(5);
        setAttemptsRemaining(0);
        setError("Too many failed login attempts. Your account is temporarily locked.");
      }
    } else {
      window.localStorage.removeItem("oni247-login-retry-at");
      window.localStorage.removeItem("oni247-login-retry-type");
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (retryAt && retryAt > Date.now()) {
      window.localStorage.setItem("oni247-login-retry-at", String(retryAt));
      if (retryType) window.localStorage.setItem("oni247-login-retry-type", retryType);
      if (requestCount !== null) window.localStorage.setItem("oni247-login-request-count", String(requestCount));
      if (requestLimit !== null) window.localStorage.setItem("oni247-login-request-limit", String(requestLimit));
      if (requestsRemaining !== null) window.localStorage.setItem("oni247-login-requests-remaining", String(requestsRemaining));
    } else if (retryAt) {
      window.localStorage.removeItem("oni247-login-retry-at");
      window.localStorage.removeItem("oni247-login-retry-type");
      window.localStorage.removeItem("oni247-login-request-count");
      window.localStorage.removeItem("oni247-login-request-limit");
      window.localStorage.removeItem("oni247-login-requests-remaining");
    }
  }, [retryAt, retryType, requestCount, requestLimit, requestsRemaining]);

  const submit = async (data: LoginData) => {
    setError(null);
    setAttemptsRemaining(null);
    setFailedAttempts(null);
    setRequestCount(null);
    setRequestLimit(null);
    setRequestsRemaining(null);
    setRetryType(null);
    setLoading(true);
    try {
      const result = await postLogin(data);
      onLogin(result.user);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof LoginAttemptError) {
        setError(err.message);
        setAttemptsRemaining(typeof err.attemptsRemaining === "number" ? err.attemptsRemaining : null);
        setFailedAttempts(typeof err.failedAttempts === "number" ? err.failedAttempts : null);
        setRequestCount(typeof err.requestCount === "number" ? err.requestCount : null);
        setRequestLimit(typeof err.requestLimit === "number" ? err.requestLimit : null);
        setRequestsRemaining(typeof err.requestsRemaining === "number" ? err.requestsRemaining : null);
        if (typeof err.retryAt === "number") {
          setRetryAt(err.retryAt);
          setRetryType(typeof err.requestLimit === "number" ? "IP_RATE_LIMITED" : "PASSWORD_LOCKOUT");
        }
      } else {
        setError(err instanceof Error ? err.message : "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className={loginStyles.form}>
        {error && <div className={loginStyles.errorMessage} role="alert">
          {error}
          {requestCount !== null && requestLimit !== null && (
            <p aria-live="polite">
              You have made {requestCount} login requests in this 15-minute window (limit: {requestLimit}). {requestsRemaining ?? 0} requests remaining.
            </p>
          )}
          {failedAttempts !== null && (
            <p aria-live="polite">
              You have used {failedAttempts} of 5 login attempts. {attemptsRemaining === 0
                ? "No attempts remaining. Your login is temporarily locked."
                : `${attemptsRemaining ?? 0} ${attemptsRemaining === 1 ? "attempt" : "attempts"} remaining.`}
            </p>
          )}
        </div>}
        {retryAt !== null && retryAt > now && (
          <div role="status" aria-live="polite">
            {retryType === "IP_RATE_LIMITED"
              ? "Login requests are temporarily paused."
              : `Login temporarily locked after ${failedAttempts ?? 5} failed password attempts. No attempts remaining.`} Time left: {Math.floor((retryAt - now) / 60000)}m {Math.floor(((retryAt - now) % 60000) / 1000)}s.
          </div>
        )}
        <FormItem name="email">
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input type="email" autoComplete="email" placeholder="your@email.com" disabled={loading}
              value={form.values.email}
              onChange={(event) => form.setValues((current) => ({ ...current, email: event.target.value }))} />
          </FormControl>
          <FormMessage />
        </FormItem>
        <FormItem name="password">
          <FormLabel>Password</FormLabel>
          <FormControl>
            <Input type="password" autoComplete="current-password" placeholder="••••••••" disabled={loading}
              value={form.values.password}
              onChange={(event) => form.setValues((current) => ({ ...current, password: event.target.value }))} />
          </FormControl>
          <FormMessage />
        </FormItem>
        <Button type="submit" disabled={loading || (retryAt !== null && retryAt > now)} className={loginStyles.submitButton}>
          {loading ? <><Spinner size="sm" /> Logging in…</> : "Log In"}
        </Button>
      </form>
    </Form>
  );
}

export function LoginPageNext() {
  const { authState } = useAuth();
  if (authState.type === "authenticated") {
    return <AuthShellNext title="You are signed in" subtitle="Your Oni247 account is ready." footer={<Link href="/dashboard">Open dashboard</Link>}>
      <Button onClick={() => window.location.assign("/dashboard")}>Continue to dashboard</Button>
    </AuthShellNext>;
  }
  return (
    <AuthShellNext title="Welcome back" subtitle="Log in to manage your business page, products and orders."
      footer={<span>New here? <Link href="/register">Create an account</Link></span>}>
      <LoginFormNext />
      <p style={{ marginTop: 12, textAlign: "center" }}><Link href="/forgot-password">Forgot password?</Link></p>
    </AuthShellNext>
  );
}

function RegisterFormNext() {
  const router = useRouter();
  const { onLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    schema: registerSchema,
    defaultValues: { email: "", password: "", displayName: "" },
  });

  const submit = async (data: RegisterData) => {
    setError(null);
    setLoading(true);
    try {
      const result = await postRegister(data);
      onLogin(result.user);
      router.replace("/verify-email");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed. Please try again.";
      if (message.includes("Email already in use")) {
        setError("This email is already registered. Please log in instead.");
      } else if (message.toLowerCase().includes("display name")) {
        setError("Please provide a valid display name.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className={registerStyles.form}>
        {error && <div className={registerStyles.errorMessage} role="alert">{error}</div>}
        <FormItem name="email">
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input type="email" autoComplete="email" placeholder="your@email.com" disabled={loading}
              value={form.values.email}
              onChange={(event) => form.setValues((current) => ({ ...current, email: event.target.value }))} />
          </FormControl>
          <FormMessage />
        </FormItem>
        <FormItem name="displayName">
          <FormLabel>Display Name</FormLabel>
          <FormControl>
            <Input placeholder="Your Name" disabled={loading} value={form.values.displayName}
              onChange={(event) => form.setValues((current) => ({ ...current, displayName: event.target.value }))} />
          </FormControl>
          <FormDescription>Spaces, emojis, and special characters are allowed.</FormDescription>
          <FormMessage />
        </FormItem>
        <FormItem name="password">
          <FormLabel>Password</FormLabel>
          <FormControl>
            <Input type="password" autoComplete="new-password" placeholder="At least 8 characters" disabled={loading}
              value={form.values.password}
              onChange={(event) => form.setValues((current) => ({ ...current, password: event.target.value }))} />
          </FormControl>
          <FormDescription>At least 8 characters with uppercase, lowercase, and number.</FormDescription>
          <FormMessage />
        </FormItem>
        <Button type="submit" disabled={loading} className={registerStyles.submitButton}>
          {loading ? <><Spinner size="sm" /> Creating account…</> : "Create Account"}
        </Button>
      </form>
    </Form>
  );
}

export function RegisterPageNext() {
  const { authState } = useAuth();
  if (authState.type === "authenticated") {
    return <AuthShellNext title="Account already signed in" subtitle="Continue to your dashboard." footer={<Link href="/dashboard">Dashboard</Link>}>
      <Button onClick={() => window.location.assign("/dashboard")}>Continue</Button>
    </AuthShellNext>;
  }
  return <AuthShellNext title="Create your account" subtitle="Start building your business presence with Oni247."
    footer={<span>Already have an account? <Link href="/login">Log in</Link></span>}>
    <RegisterFormNext />
  </AuthShellNext>;
}

export function ForgotPasswordPageNext() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const result = await postForgotPassword({ email });
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset link.");
    } finally {
      setLoading(false);
    }
  };

  return <AuthShellNext title="Reset your password" subtitle="Enter the email on your Oni247 account and we’ll send a reset link."
    footer={<Link href="/login">Back to login</Link>}>
    <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      <Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}
        placeholder="your@email.com" required disabled={loading} />
      <Button type="submit" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  </AuthShellNext>;
}

function VerifyEmailContentNext() {
  const { authState } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = params.get("token");
  const authType = authState.type;
  const emailVerifiedAt = authState.type === "authenticated" ? authState.user.emailVerifiedAt : null;
  const [message, setMessage] = useState("Check your inbox for a verification link.");
  const [loading, setLoading] = useState(false);
  const processedToken = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refreshSession = async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEY });
    };

    if (token && processedToken.current !== token) {
      processedToken.current = token;
      setLoading(true);
      void postVerifyEmail({ token })
        .then(async () => {
          setMessage("Email verified. Your account is ready.");
          await refreshSession();
          if (!cancelled) router.replace("/dashboard");
        })
        .catch((err: unknown) => setMessage(err instanceof Error ? err.message : "Verification failed."))
        .finally(() => { if (!cancelled) setLoading(false); });
    } else if (authState.type === "authenticated" && authState.user.emailVerifiedAt) {
      void refreshSession().finally(() => { if (!cancelled) router.replace("/dashboard"); });
    } else if (authState.type === "authenticated" && !authState.user.emailVerifiedAt) {
      void refreshSession();
    }

    return () => { cancelled = true; };
  }, [authType, emailVerifiedAt, queryClient, router, token]);

  const resend = async () => {
    setLoading(true);
    try {
      await postSendVerification();
      setMessage("A new verification email has been sent.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not send the email.");
    } finally {
      setLoading(false);
    }
  };

  return <AuthShellNext title="Verify your email"
    subtitle={authState.type === "authenticated" ? `We sent a verification link to ${authState.user.email}.` : "Open the verification link from your email to continue."}
    footer={<Link href="/login">Back to login</Link>}>
    <p>{message}</p>
    {loading && <Spinner size="sm" />}
    {authState.type === "authenticated" && !authState.user.emailVerifiedAt &&
      <Button type="button" onClick={() => void resend()} disabled={loading}>Resend verification email</Button>}
  </AuthShellNext>;
}

export function VerifyEmailPageNext() {
  return <Suspense fallback={<AuthShellNext title="Verify your email" subtitle="Loading verification status…" footer={<Link href="/login">Back to login</Link>}><Spinner size="sm" /></AuthShellNext>}>
    <VerifyEmailContentNext />
  </Suspense>;
}
