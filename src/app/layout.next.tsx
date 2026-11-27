import type { Metadata } from "next";
import type { ReactNode } from "react";
import Providers from "./providers.next";
import "../../base.css";

export const metadata: Metadata = {
  title: "Oni247 — Your business, online",
  description: "Build and manage your business website with Oni247.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
