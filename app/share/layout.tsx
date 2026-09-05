import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared Credentials",
  description: "Restricted credential access",
};

export default function ShareLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}