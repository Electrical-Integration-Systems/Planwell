"use client";

import { useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AuditHistoryList } from "@/components/AuditHistoryList";
import { PlanwellLogoMark } from "@/components/PlanwellLogoMark";
import { AuditHistoryToolbar } from "@/components/audit-history/AuditHistoryToolbar";

export default function AuditHistoryPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [entityFilter, setEntityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const logs =
    useQuery(
      api.auditLog.list,
      entityFilter === "all" ? {} : { entityType: entityFilter },
    ) ?? [];

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
      <AuditHistoryToolbar
        entityFilter={entityFilter}
        onEntityFilterChange={setEntityFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        showSearch={logs.length > 0}
      />

      <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-0 pb-6 animate-fade-in-up stagger-3">
        <AuditHistoryList logs={logs} searchQuery={searchQuery} />
      </div>
    </>
  );
}