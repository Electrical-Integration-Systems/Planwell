"use client";

import { Plus, Search, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
  const presets = useQuery(api.filterPresets.list) ?? [];

  const [filters, setFilters] = useState<Filters>({});
  const [sortKeys, setSortKeys] = useState<SortKey[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [activePresetId, setActivePresetId] = useState<Id<"filterPresets"> | null>(null);

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

  const applyPreset = (presetId: Id<"filterPresets">) => {
    const preset = presets.find((p) => p._id === presetId);
    if (!preset) return;

    if (activePresetId === presetId) {
      // Toggle off
      setActivePresetId(null);
      setFilters({});
      setSortKeys([]);
      return;
    }

    setActivePresetId(presetId);
    try {
      const parsedFilters = JSON.parse(preset.filters) as Filters;
      const parsedSortKeys = JSON.parse(preset.sortKeys) as SortKey[];
      setFilters(parsedFilters);
      setSortKeys(parsedSortKeys);
    } catch {
      /* ignore bad data */
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onSettingsOpen={() => setSettingsOpen(true)} onHistoryOpen={() => setHistoryOpen(true)} />

      <main className="flex-1 flex flex-col max-w-[1400px] w-full mx-auto px-6 lg:px-8">
        {/* Page heading */}
        <div className="flex items-end justify-between py-5 animate-fade-in-up">
          <div>
            <h2 className="font-serif text-2xl tracking-tight flex items-center gap-2">
              Tasks
              <span className="h-[2px] flex-1 max-w-[80px] bg-gradient-to-r from-primary/60 to-transparent rounded-full" />
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Manage and track your team&apos;s work
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 rounded-lg px-3"
            onClick={() => setIsAddingTask(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </Button>
        </div>

        {/* Sticky toolbar: tabs, search, filters, sort, presets, table header */}
        <div className="sticky top-[calc(3.5rem+4px)] z-30 bg-background/95 backdrop-blur-sm -mx-6 lg:-mx-8 px-6 lg:px-8 border-b border-border/40 pb-0">
          {/* Tab row + Search */}
          <div className="flex items-center gap-4 pt-2 pb-2">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === "active"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("active")}
              >
                Active
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === "archived"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("archived")}
              >
                <Archive className="h-3 w-3" />
                Archived
              </button>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="h-8 text-xs pl-8 border-border/50 bg-transparent shadow-none rounded-lg"
              />
            </div>
          </div>

          {/* Filters & Sort */}
          <div className="flex flex-col gap-2 pb-2">
            <TaskFilters filters={filters} onFiltersChange={(f) => { setFilters(f); setActivePresetId(null); }} />
            <TaskSort sortKeys={sortKeys} onSortKeysChange={(k) => { setSortKeys(k); setActivePresetId(null); }} />
          </div>

          {/* Presets chips */}
          {presets.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pb-2">
              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mr-1">
                Presets
              </span>
              {presets.map((preset) => (
                <Badge
                  key={preset._id}
                  variant={activePresetId === preset._id ? "default" : "outline"}
                  className="h-6 text-[11px] px-2.5 rounded-full cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => applyPreset(preset._id)}
                >
                  {preset.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Task list */}
        <div className="flex-1 pt-3 animate-fade-in-up stagger-3">
          <TaskList
            key={`${activeTab}-${JSON.stringify(filters)}`}
            filters={filters}
            sortKeys={sortKeys}
            onTaskSelect={setSelectedTaskId}
            isAddingTask={isAddingTask && activeTab === "active"}
            onIsAddingTaskChange={setIsAddingTask}
            archived={activeTab === "archived"}
            searchQuery={searchQuery}
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

        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          currentFilters={filters}
          currentSortKeys={sortKeys}
        />
        <AuditHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
      </main>
    </div>
  );
}
