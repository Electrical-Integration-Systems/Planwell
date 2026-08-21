import type { Metadata } from "next";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/providers/ConvexClientProvider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Planwell",
  description: "A collaborative task tracking workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="antialiased">
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <Toaster richColors closeButton />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
