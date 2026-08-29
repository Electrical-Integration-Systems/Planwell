"use client";

import { Archive, Plus, Search } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { TaskFilters } from "@/components/TaskFilters";
import { TaskSort } from "@/components/TaskSort";
import { TASK_GRID_COLS } from "@/components/TaskList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type TaskPageSortKey = {
  column: string;
  direction: "asc" | "desc";
};

export type TaskPageFilters = {
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

type FilterPreset = {
  _id: Id<"filterPresets">;
  name: string;
};

export function TasksPageToolbar({
  activeTab,
  searchQuery,
  onActiveTabChange,
  onSearchQueryChange,
  onAddTask,
  filters,
  onFiltersChange,
  sortKeys,
  onSortKeysChange,
  presets,
  activePresetId,
  onPresetSelect,
}: {
  activeTab: "active" | "archived";
  searchQuery: string;
  onActiveTabChange: (value: "active" | "archived") => void;
  onSearchQueryChange: (value: string) => void;
  onAddTask: () => void;
  filters: TaskPageFilters;
  onFiltersChange: (filters: TaskPageFilters) => void;
  sortKeys: TaskPageSortKey[];
  onSortKeysChange: (sortKeys: TaskPageSortKey[]) => void;
  presets: FilterPreset[];
  activePresetId: Id<"filterPresets"> | null;
  onPresetSelect: (presetId: Id<"filterPresets">) => void;
}) {
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40">
      <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 py-3 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === "active"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onActiveTabChange("active")}
              >
                Active
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === "archived"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onActiveTabChange("archived")}
              >
                <Archive className="h-3 w-3" />
                Archived
              </button>
            </div>

            <div className="relative w-full sm:flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Search tasks..."
                className="h-8 text-xs pl-8 border-border/50 bg-transparent shadow-none rounded-lg"
              />
            </div>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 rounded-lg px-3 sm:ml-auto"
              onClick={onAddTask}
            >
              <Plus className="h-3.5 w-3.5" />
              Add task
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <TaskFilters filters={filters} onFiltersChange={onFiltersChange} />
            <TaskSort sortKeys={sortKeys} onSortKeysChange={onSortKeysChange} />
          </div>

          {presets.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mr-1">
                Presets
              </span>
              {presets.map((preset) => (
                <Badge
                  key={preset._id}
                  variant={activePresetId === preset._id ? "default" : "outline"}
                  className="h-6 text-[11px] px-2.5 rounded-full cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => onPresetSelect(preset._id)}
                >
                  {preset.name}
                </Badge>
              ))}
            </div>
          ) : null}

          <div
            className="hidden md:grid items-center py-2.5 border-t border-border/30"
            style={{ gridTemplateColumns: TASK_GRID_COLS }}
          >
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">State</div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assignees</div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Updated</div>
            <div />
          </div>
        </div>
      </div>
    </div>
  );
}