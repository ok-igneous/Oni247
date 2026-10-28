import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { AuthShell } from "../components/AuthShell";
import { PasswordLoginForm } from "../components/PasswordLoginForm";
import { useAuth } from "../helpers/useAuth";
import styles from "./login.module.css";

const LoginPage = () => {
  const { authState } = useAuth();
   10	
   11	  if (authState.type === "authenticated") {
   12	    return <Navigate to="/dashboard" replace />;
   13	  }
   14	
   15	  return (
   16	    <>
   17	      <Helmet>
   18	        <title>Log in — Oniduka</title>
   19	      </Helmet>
   20	      <AuthShell
   21	        title="Welcome back"
   22	        subtitle="Log in to manage your business page, products and orders."
   23	        footer={
   24	          <span>
   25	            New here?{" "}
   26	            <Link to="/register" className={styles.link}>
   27	              Create an account
   28	            </Link>
   29	          </span>
   30	        }
   31	      >
   32	        <PasswordLoginForm />
   33	        <div style={{ marginTop: 12, textAlign: "center" }}>
   34	          <Link to="/forgot-password" className={styles.link}>Forgot password?</Link>
   35	        </div>
   36	      </AuthShell>
   37	    </>
   38	  );
   39	};
   40	
   41	export default LoginPage;
