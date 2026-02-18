"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { TaskList } from "@/components/TaskList";
import { TaskFilters } from "@/components/TaskFilters";
import { TaskSort } from "@/components/TaskSort";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { AuditHistoryDialog } from "@/components/AuditHistoryDialog";
import type { Id } from "@/convex/_generated/dataModel";

type SortKey = {
  column: string;
  direction: "asc" | "desc";
};

type Filters = {
  stateIds?: Id<"taskStates">[];
  excludeStateIds?: Id<"taskStates">[];
  priorityIds?: Id<"priorities">[];
  excludePriorityIds?: Id<"priorities">[];
  projectIds?: Id<"projects">[];
  excludeProjectIds?: Id<"projects">[];
  assigneeIds?: Id<"users">[];
  excludeAssigneeIds?: Id<"users">[];
  tagIds?: Id<"tags">[];
  excludeTagIds?: Id<"tags">[];
};

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const seedAll = useMutation(api.seed.seedAll);
  const states = useQuery(api.taskStates.list);
  const priorities = useQuery(api.priorities.list);

  const [filters, setFilters] = useState<Filters>({});
  const [sortKeys, setSortKeys] = useState<SortKey[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(
    null,
  );

  // Auto-seed if states/priorities are empty
  const needsSeed =
    states !== undefined &&
    states.length === 0 &&
    priorities !== undefined &&
    priorities.length === 0;

  if (needsSeed) {
    void seedAll();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <span className="font-serif text-base text-primary animate-subtle-pulse">
              P
            </span>
          </div>
          <p className="text-xs text-muted-foreground tracking-wide">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen">
      <Header onSettingsOpen={() => setSettingsOpen(true)} onHistoryOpen={() => setHistoryOpen(true)} />

      <main className="max-w-[1400px] mx-auto px-6 lg:px-8 py-6">
        {/* Page heading */}
        <div className="flex items-end justify-between mb-5 animate-fade-in-up">
          <div>
            <h2 className="font-serif text-2xl tracking-tight flex items-center gap-2">
              Tasks
              <span className="h-[2px] flex-1 max-w-[80px] bg-gradient-to-r from-primary/60 to-transparent rounded-full" />
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Manage and track your team&apos;s work
            </p>
          </div>
        </div>

        {/* Filters & Sort */}
        <div className="flex flex-col gap-2 mb-4 animate-fade-in-up stagger-2">
          <TaskFilters filters={filters} onFiltersChange={setFilters} />
          <TaskSort sortKeys={sortKeys} onSortKeysChange={setSortKeys} />
        </div>

        {/* Task list with inline + button at bottom */}
        <div className="animate-fade-in-up stagger-3">
          <TaskList
            filters={filters}
            sortKeys={sortKeys}
            onTaskSelect={setSelectedTaskId}
          />
        </div>

        {selectedTaskId !== null && (
          <TaskDetailDialog
            taskId={selectedTaskId}
            open={selectedTaskId !== null}
            onOpenChange={(open: boolean) => {
              if (!open) setSelectedTaskId(null);
            }}
          />
        )}

        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        <AuditHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
      </main>
    </div>
  );
}
