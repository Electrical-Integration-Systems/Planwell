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
        {/* Sticky toolbar: heading, search, upload controls */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40">
          <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8">
            {/* Page heading */}
            <div className="flex items-end justify-between pt-4 sm:pt-5 pb-2 sm:pb-3 animate-fade-in-up">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl tracking-tight flex items-center gap-2">
                  Files
                  <span className="h-[2px] flex-1 max-w-[80px] bg-gradient-to-r from-primary/60 to-transparent rounded-full" />
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Organize and manage uploaded files
                </p>
              </div>
            </div>
          </div>
        </div>

          <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-0 pb-6">
            <FilesBrowser />
        </div>
    </>
  );
}
