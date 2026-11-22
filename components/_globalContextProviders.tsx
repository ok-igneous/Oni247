import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeModeProvider } from "../helpers/themeMode";
import { AuthProvider } from "../helpers/useAuth";
import { TooltipProvider } from "./Tooltip";
import { SonnerToaster } from "./SonnerToaster";
import { ScrollToHashElement } from "./ScrollToHashElement";
import { UploadProgressDialog } from "./UploadProgressDialog";
import { ImageSourceHost } from "./ImageSourceHost";
import { PageViewTracker } from "./PageViewTracker";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute “fresh” window
    },
  },
});

export const GlobalContextProviders = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeModeProvider>
          <ScrollToHashElement />
          <PageViewTracker />
          <TooltipProvider>
            {children}
            <SonnerToaster />
            <UploadProgressDialog />
            <ImageSourceHost />
          </TooltipProvider>
        </ThemeModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

