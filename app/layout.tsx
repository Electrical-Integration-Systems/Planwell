import type { Metadata } from "next";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { AppShell } from "@/components/layout/AppShell";
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
          <ConvexClientProvider>
            <AppShell>{children}</AppShell>
          </ConvexClientProvider>
          <Toaster richColors closeButton />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
