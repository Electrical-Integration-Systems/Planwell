"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSettingsContext } from "@/components/layout/AppShell";
import { PlanwellLogoMark } from "@/components/PlanwellLogoMark";
import { TaskList } from "@/components/TaskList";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import {
  TasksPageToolbar,
  type TaskPageFilters as Filters,
  type TaskPageSortKey as SortKey,
} from "@/components/tasks/TasksPageToolbar";
import type { Id } from "@/convex/_generated/dataModel";

export default function Tasks() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const seedAll = useMutation(api.seed.seedAll);
  const states = useQuery(api.taskStates.list);
  const priorities = useQuery(api.priorities.list);
  const presets = useQuery(api.filterPresets.list) ?? [];

  const [filters, setFilters] = useState<Filters>({});
  const [sortKeys, setSortKeys] = useState<SortKey[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [activePresetId, setActivePresetId] = useState<Id<"filterPresets"> | null>(null);

  useSettingsContext(filters, sortKeys);

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
          <PlanwellLogoMark size="sm" />
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
    <>
      <TasksPageToolbar
        activeTab={activeTab}
        searchQuery={searchQuery}
        onActiveTabChange={setActiveTab}
        onSearchQueryChange={setSearchQuery}
        onAddTask={() => setIsAddingTask(true)}
        filters={filters}
        onFiltersChange={(nextFilters) => {
          setFilters(nextFilters);
          setActivePresetId(null);
        }}
        sortKeys={sortKeys}
        onSortKeysChange={(nextSortKeys) => {
          setSortKeys(nextSortKeys);
          setActivePresetId(null);
        }}
        presets={presets}
        activePresetId={activePresetId}
        onPresetSelect={applyPreset}
      />

      <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-0 pb-6 animate-fade-in-up stagger-3">
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

    </>
  );
}
