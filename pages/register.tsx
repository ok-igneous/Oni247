import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { AuthShell } from "../components/AuthShell";
import { PasswordRegisterForm } from "../components/PasswordRegisterForm";
import { useAuth } from "../helpers/useAuth";
import styles from "./register.module.css";

const RegisterPage = () => {
  const { authState } = useAuth();

  if (authState.type === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Create your account — Oni247</title>
      </Helmet>
      <AuthShell
        title="Put your shop online"
        subtitle="Create an account, add your products, and start taking orders on WhatsApp."
        footer={
          <span>
            Already have an account?{" "}
            <Link to="/login" className={styles.link}>
              Log in
            </Link>
          </span>
        }
      >
        <PasswordRegisterForm />
      </AuthShell>
    </>
  );
};

export default RegisterPage;
