import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeModeProvider } from "../helpers/themeMode";
import { AuthProvider } from "../helpers/useAuth";
import { TooltipProvider } from "./Tooltip";
import { SonnerToaster } from "./SonnerToaster";
import { ScrollToHashElement } from "./ScrollToHashElement";

const queryClient = new QueryClient({
   10	  defaultOptions: {
   11	    queries: {
   12	      staleTime: 60 * 1000, // 1 minute “fresh” window
   13	    },
   14	  },
   15	});
   16	
   17	export const GlobalContextProviders = ({
   18	  children,
   19	}: {
   20	  children: ReactNode;
   21	}) => {
   22	  return (
   23	    <QueryClientProvider client={queryClient}>
   24	      <AuthProvider>
   25	        <ThemeModeProvider>
   26	          <ScrollToHashElement />
   27	          <TooltipProvider>
   28	            {children}
   29	            <SonnerToaster />
   30	          </TooltipProvider>
   31	        </ThemeModeProvider>
   32	      </AuthProvider>
   33	    </QueryClientProvider>
   34	  );
   35	};
   36	
