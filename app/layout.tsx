import type { Metadata, Viewport } from "next";
import "../base.css";

export const metadata: Metadata = {
  title: {
    default: "Oni247",
    template: "%s | Oni247",
  },
  description: "Create and manage your business storefront with Oni247.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
