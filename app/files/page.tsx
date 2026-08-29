"use client";

import { useConvexAuth } from "convex/react";
import { FilesBrowser } from "@/components/FilesBrowser";
import { PlanwellLogoMark } from "@/components/PlanwellLogoMark";

export default function FilesPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <PlanwellLogoMark size="sm" />
          <p className="text-xs text-muted-foreground tracking-wide">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <>
          <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-6 animate-fade-in-up">
            <FilesBrowser />
        </div>
    </>
  );
}
