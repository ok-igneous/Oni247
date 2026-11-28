import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { AuthShell } from "../components/AuthShell";
import { Button } from "../components/Button";
import { Spinner } from "../components/Spinner";
import { useAuth, AUTH_QUERY_KEY } from "../helpers/useAuth";
import { postSendVerification } from "../endpoints/auth/send_verification_POST.schema";
import { postVerifyEmail } from "../endpoints/auth/verify_email_POST.schema";

const VerifyEmailPage = () => {
  const { authState } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
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
          if (!cancelled) navigate("/dashboard", { replace: true });
        })
        .catch((error: unknown) => {
          setMessage(error instanceof Error ? error.message : "Verification failed.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else if (authState.type === "authenticated" && authState.user.emailVerifiedAt) {
      void refreshSession().finally(() => {
        if (!cancelled) navigate("/dashboard", { replace: true });
      });
    } else if (authState.type === "authenticated" && !authState.user.emailVerifiedAt) {
      // Refresh once on entry: the verification status may have changed in another tab.
      void refreshSession();
    }

    return () => {
      cancelled = true;
    };
  }, [authType, emailVerifiedAt, navigate, queryClient, token]);

  const resend = async () => {
    setLoading(true);
    try {
      await postSendVerification();
      setMessage("A new verification email has been sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send the email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Verify your email — Oni247</title>
      </Helmet>
      <AuthShell
        title="Verify your email"
        subtitle={
          authState.type === "authenticated"
            ? `We sent a verification link to ${authState.user.email}.`
            : "Open the verification link from your email to continue."
        }
        footer={<Link to="/login">Back to login</Link>}
      >
        <p>{message}</p>
        {authState.type === "authenticated" && !authState.user.emailVerifiedAt && (
          <Button type="button" onClick={() => void resend()} disabled={loading}>
            {loading ? <><Spinner size="sm" /> Sending…</> : "Resend verification email"}
          </Button>
        )}
      </AuthShell>
    </>
  );
};

export default VerifyEmailPage;
