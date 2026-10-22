"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { Button } from "@/components/ui/button";

export function ReportShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  if (isLoading) return <p className="p-8 text-sm text-muted-foreground" role="status">Se încarcă…</p>;
  if (!isAuthenticated) return <Button asChild className="m-8"><Link href="/signin">Autentificare</Link></Button>;
  return (
    <div className="min-h-screen bg-background">
      <Header onSettingsOpen={() => setSettingsOpen(true)} isSettingsOpen={settingsOpen} />
      <main className="mx-auto w-full max-w-[1400px] space-y-6 px-3 py-6 sm:px-6 lg:px-8">{children}</main>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
