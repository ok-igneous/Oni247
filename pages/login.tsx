import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { AuthShell } from "../components/AuthShell";
import { PasswordLoginForm } from "../components/PasswordLoginForm";
import { useAuth } from "../helpers/useAuth";
import styles from "./login.module.css";

const LoginPage = () => {
  const { authState } = useAuth();

  if (authState.type === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Log in — Oni247</title>
      </Helmet>
      <AuthShell
        title="Welcome back"
        subtitle="Log in to manage your business page, products and orders."
        footer={
          <span>
            New here?{" "}
            <Link to="/register" className={styles.link}>
              Create an account
            </Link>
          </span>
        }
      >
        <PasswordLoginForm />
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <Link to="/forgot-password" className={styles.link}>Forgot password?</Link>
        </div>
      </AuthShell>
    </>
  );
};

export default LoginPage;
