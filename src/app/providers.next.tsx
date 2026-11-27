"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../../helpers/useAuth";
import { ThemeModeProvider } from "../../helpers/themeMode";
import { TooltipProvider } from "../../components/Tooltip";
import { SonnerToaster } from "../../components/SonnerToaster";
import { UploadProgressDialog } from "../../components/UploadProgressDialog";
import { ImageSourceHost } from "../../components/ImageSourceHost";

/**
 * Next.js has its own provider tree. Do not import the legacy global provider:
 * its route effects depend on BrowserRouter, and its module-level QueryClient
 * would be shared by concurrent server renders.
 */
export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeModeProvider>
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
}
