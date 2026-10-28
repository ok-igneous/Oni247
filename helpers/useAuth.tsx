import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSession } from "../endpoints/auth/session_GET.schema";
   10	import { postLogout } from "../endpoints/auth/logout_POST.schema";
   11	import { User } from "./User";
   12	
   13	// React Query key for auth session. Make sure to optimistically update user infos using this.
   14	export const AUTH_QUERY_KEY = ["auth", "session"] as const;
   15	
   16	// Do not use this state in login/register UI because it's irrelevant. Only use it in UI that requires authentication.
   17	// For pages that requires authentication only in parts of the UI (e.g. typical home page with a user avatar), the loading
   18	// state should not apply to the full page, only to the parts that require authentication.
   19	// Also, global context providers should not be blocked on auth states as it will block the whole page.
   20	type AuthState =
   21	  | {
   22	      // Make sure to display a nice loading state UI when loading authentication state
   23	      type: "loading";
   24	    }
   25	  | {
   26	      type: "authenticated";
   27	      user: User;
   28	    }
   29	  | {
   30	      // Make sure to redirect to login or show auth error UI
   31	      type: "unauthenticated";
   32	      errorMessage?: string;
   33	    };
   34	
   35	type AuthContextType = {
   36	  // Use this to display the correct UI based on auth state
   37	  authState: AuthState;
   38	  // Notify the auth provider that we have logged in
   39	  onLogin: (user: User) => void;
   40	  // Clear the auth state and perform the logout request
   41	  logout: () => Promise<void>;
   42	};
   43	
   44	const AuthContext = createContext<AuthContextType | undefined>(undefined);
   45	
   46	// Add this to components/_globalContextProviders but not any pageLayout files.
   47	// Make sure it's within the QueryClientProvider
   48	export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
   49	  children,
   50	}) => {
   51	  const queryClient = useQueryClient();
   52	
   53	  const { data, error, status, refetch } = useQuery({
   54	    queryKey: AUTH_QUERY_KEY,
   55	    queryFn: async () => {
   56	      const result = await getSession();
   57	      if ("error" in result) {
   58	        throw new Error(result.error);
   59	      }
   60	      return result.user;
   61	    },
   62	    retry: 1,
   63	    enabled: true,
   64	    staleTime: Infinity,
   65	  });
   66	
   67	  const authState: AuthState =
   68	    status === "pending"
   69	      ? { type: "loading" }
   70	      : status === "error"
   71	        ? {
   72	            type: "unauthenticated",
   73	            errorMessage:
   74	              error instanceof Error ? error.message : "Session check failed",
   75	          }
   76	        : data
   77	          ? { type: "authenticated", user: data }
   78	          : { type: "unauthenticated" };
   79	
   80	  const logout = useCallback(async () => {
   81	    // Optimistically update UI
   82	    queryClient.setQueryData(AUTH_QUERY_KEY, null);
   83	    // Make the actual API call
   84	    await postLogout();
   85	    // Invalidate all queries after login so previous user's state don't corrupt new user state.
   86	    queryClient.resetQueries();
   87	  }, [queryClient]);
   88	
   89	  // This should only be used for login. For user profile changes, create separate endpoints and react query hooks
   90	  // and update the data linked to AUTH_QUERY_KEY.
   91	  const onLogin = useCallback(
   92	    (user: User) => {
   93	      queryClient.setQueryData(AUTH_QUERY_KEY, user);
   94	    },
   95	    [queryClient]
   96	  );
   97	
   98	  return (
   99	    <AuthContext.Provider value={{ authState, logout, onLogin }}>
  100	      {children}
  101	    </AuthContext.Provider>
  102	  );
  103	};
  104	
  105	// Prefer using protectedRoutes instead of this hook unless the route doesn't need to be protected (e.g. login/register)
  106	export const useAuth = (): AuthContextType => {
  107	  const context = useContext(AuthContext);
  108	  if (context === undefined) {
  109	    throw new Error("useAuth must be used within a AuthProvider");
  110	  }
  111	  return context;
  112	};
  113	
