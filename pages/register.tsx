import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { AuthShell } from "../components/AuthShell";
import { PasswordRegisterForm } from "../components/PasswordRegisterForm";
import { useAuth } from "../helpers/useAuth";
import styles from "./register.module.css";

const RegisterPage = () => {
  const { authState } = useAuth();
   10	
   11	  if (authState.type === "authenticated") {
   12	    return <Navigate to="/dashboard" replace />;
   13	  }
   14	
   15	  return (
   16	    <>
   17	      <Helmet>
   18	        <title>Create your account — Oniduka</title>
   19	      </Helmet>
   20	      <AuthShell
   21	        title="Put your shop online"
   22	        subtitle="Create an account, add your products, and start taking orders on WhatsApp."
   23	        footer={
   24	          <span>
   25	            Already have an account?{" "}
   26	            <Link to="/login" className={styles.link}>
   27	              Log in
   28	            </Link>
   29	          </span>
   30	        }
   31	      >
   32	        <PasswordRegisterForm />
   33	      </AuthShell>
   34	    </>
   35	  );
   36	};
   37	
   38	export default RegisterPage;