"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X, ChevronDown } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

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

function StateFilterDropdown({
  filters,
  onFiltersChange,
}: {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}) {
  const states = useQuery(api.taskStates.list) ?? [];
  const selectedIds = filters.stateIds ?? [];
  const excludedIds = filters.excludeStateIds ?? [];
  const isExclusionMode = excludedIds.length > 0;
  const hasSelection = selectedIds.length > 0 || isExclusionMode;

  const handleToggle = (id: Id<"taskStates">) => {
    if (isExclusionMode) {
      const newExcluded = excludedIds.includes(id)
        ? excludedIds.filter((i) => i !== id)
        : [...excludedIds, id];
      onFiltersChange({ ...filters, excludeStateIds: newExcluded });
    } else {
      const newSelected = selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id];
      onFiltersChange({
        ...filters,
        stateIds: newSelected.length ? newSelected : undefined,
      });
    }
  };

  const handleModeToggle = () => {
    if (isExclusionMode) {
      onFiltersChange({
        ...filters,
        stateIds: excludedIds.length > 0 ? excludedIds : undefined,
        excludeStateIds: [],
      });
    } else {
      onFiltersChange({
        ...filters,
        stateIds: [],
        excludeStateIds: selectedIds.length > 0 ? [...selectedIds] : [],
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasSelection ? "secondary" : "outline"}
          size="sm"
          className={`h-7 text-xs gap-1 rounded-lg border-border/50 bg-transparent shadow-none ${
            hasSelection ? "bg-secondary" : ""
          }`}
        >
          State
          {hasSelection && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full"
            >
              {isExclusionMode ? excludedIds.length : selectedIds.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
          <span className="text-xs font-medium">State</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleModeToggle}
          >
            {isExclusionMode ? "Exclude" : "Include"}
          </Button>
        </div>
        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {states.map((opt) => {
            const isChecked = isExclusionMode
              ? excludedIds.includes(opt._id)
              : selectedIds.includes(opt._id);
            return (
              <label
                key={opt._id}
                className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => handleToggle(opt._id)}
                />
                {opt.color && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                <span
                  className={`text-xs ${isExclusionMode && isChecked ? "line-through text-muted-foreground" : ""}`}
                >
                  {opt.name}
                </span>
              </label>
            );
          })}
        </div>
        {hasSelection && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-7 text-xs text-muted-foreground"
            onClick={() => {
              if (isExclusionMode) {
                onFiltersChange({ ...filters, excludeStateIds: [] });
              } else {
                onFiltersChange({ ...filters, stateIds: undefined });
              }
            }}
          >
            Clear State
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PriorityFilterDropdown({
  filters,
  onFiltersChange,
}: {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}) {
  const priorities = useQuery(api.priorities.list) ?? [];
  const selectedIds = filters.priorityIds ?? [];
  const excludedIds = filters.excludePriorityIds ?? [];
  const isExclusionMode = excludedIds.length > 0;
  const hasSelection = selectedIds.length > 0 || isExclusionMode;

  const handleToggle = (id: Id<"priorities">) => {
    if (isExclusionMode) {
      const newExcluded = excludedIds.includes(id)
        ? excludedIds.filter((i) => i !== id)
        : [...excludedIds, id];
      onFiltersChange({ ...filters, excludePriorityIds: newExcluded });
    } else {
      const newSelected = selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id];
      onFiltersChange({
        ...filters,
        priorityIds: newSelected.length ? newSelected : undefined,
      });
    }
  };

  const handleModeToggle = () => {
    if (isExclusionMode) {
      onFiltersChange({
        ...filters,
        priorityIds: excludedIds.length > 0 ? excludedIds : undefined,
        excludePriorityIds: [],
      });
    } else {
      onFiltersChange({
        ...filters,
        priorityIds: [],
        excludePriorityIds: selectedIds.length > 0 ? selectedIds : [],
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasSelection ? "secondary" : "outline"}
          size="sm"
          className={`h-7 text-xs gap-1 rounded-lg border-border/50 bg-transparent shadow-none ${
            hasSelection ? "bg-secondary" : ""
          }`}
        >
          Priority
          {hasSelection && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full"
            >
              {isExclusionMode ? excludedIds.length : selectedIds.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
          <span className="text-xs font-medium">Priority</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleModeToggle}
          >
            {isExclusionMode ? "Exclude" : "Include"}
          </Button>
        </div>
        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {priorities.map((opt) => {
            const isChecked = isExclusionMode
              ? excludedIds.includes(opt._id)
              : selectedIds.includes(opt._id);
            return (
              <label
                key={opt._id}
                className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => handleToggle(opt._id)}
                />
                {opt.color && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                <span
                  className={`text-xs ${isExclusionMode && isChecked ? "line-through text-muted-foreground" : ""}`}
                >
                  {opt.name}
                </span>
              </label>
            );
          })}
        </div>
        {hasSelection && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-7 text-xs text-muted-foreground"
            onClick={() => {
              if (isExclusionMode) {
                onFiltersChange({ ...filters, excludePriorityIds: [] });
              } else {
                onFiltersChange({ ...filters, priorityIds: undefined });
              }
            }}
          >
            Clear Priority
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ProjectFilterDropdown({
  filters,
  onFiltersChange,
}: {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}) {
  const projects = useQuery(api.projects.list, {}) ?? [];
  const selectedIds = filters.projectIds ?? [];
  const excludedIds = filters.excludeProjectIds ?? [];
  const isExclusionMode = excludedIds.length > 0;
  const hasSelection = selectedIds.length > 0 || isExclusionMode;

  const handleToggle = (id: Id<"projects">) => {
    if (isExclusionMode) {
      const newExcluded = excludedIds.includes(id)
        ? excludedIds.filter((i) => i !== id)
        : [...excludedIds, id];
      onFiltersChange({ ...filters, excludeProjectIds: newExcluded });
    } else {
      const newSelected = selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id];
      onFiltersChange({
        ...filters,
        projectIds: newSelected.length ? newSelected : undefined,
      });
    }
  };

  const handleModeToggle = () => {
    if (isExclusionMode) {
      onFiltersChange({
        ...filters,
        projectIds: excludedIds.length > 0 ? excludedIds : undefined,
        excludeProjectIds: [],
      });
    } else {
      onFiltersChange({
        ...filters,
        projectIds: [],
        excludeProjectIds: selectedIds.length > 0 ? selectedIds : [],
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasSelection ? "secondary" : "outline"}
          size="sm"
          className={`h-7 text-xs gap-1 rounded-lg border-border/50 bg-transparent shadow-none ${
            hasSelection ? "bg-secondary" : ""
          }`}
        >
          Project
          {hasSelection && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full"
            >
              {isExclusionMode ? excludedIds.length : selectedIds.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
          <span className="text-xs font-medium">Project</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleModeToggle}
          >
            {isExclusionMode ? "Exclude" : "Include"}
          </Button>
        </div>
        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {projects
            .filter((p) => !p.archived)
            .map((opt) => {
              const isChecked = isExclusionMode
                ? excludedIds.includes(opt._id)
                : selectedIds.includes(opt._id);
              return (
                <label
                  key={opt._id}
                  className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => handleToggle(opt._id)}
                  />
                  <span
                    className={`text-xs ${isExclusionMode && isChecked ? "line-through text-muted-foreground" : ""}`}
                  >
                    {opt.name}
                  </span>
                </label>
              );
            })}
        </div>
        {hasSelection && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-7 text-xs text-muted-foreground"
            onClick={() => {
              if (isExclusionMode) {
                onFiltersChange({ ...filters, excludeProjectIds: [] });
              } else {
                onFiltersChange({ ...filters, projectIds: undefined });
              }
            }}
          >
            Clear Project
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function AssigneeFilterDropdown({
  filters,
  onFiltersChange,
}: {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}) {
  const users = useQuery(api.users.list) ?? [];
  const selectedIds = filters.assigneeIds ?? [];
  const excludedIds = filters.excludeAssigneeIds ?? [];
  const isExclusionMode = excludedIds.length > 0;
  const hasSelection = selectedIds.length > 0 || isExclusionMode;

  const handleToggle = (id: Id<"users">) => {
    if (isExclusionMode) {
      const newExcluded = excludedIds.includes(id)
        ? excludedIds.filter((i) => i !== id)
        : [...excludedIds, id];
      onFiltersChange({ ...filters, excludeAssigneeIds: newExcluded });
    } else {
      const newSelected = selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id];
      onFiltersChange({
        ...filters,
        assigneeIds: newSelected.length ? newSelected : undefined,
      });
    }
  };

  const handleModeToggle = () => {
    if (isExclusionMode) {
      onFiltersChange({
        ...filters,
        assigneeIds: excludedIds.length > 0 ? excludedIds : undefined,
        excludeAssigneeIds: [],
      });
    } else {
      onFiltersChange({
        ...filters,
        assigneeIds: [],
        excludeAssigneeIds: selectedIds.length > 0 ? selectedIds : [],
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasSelection ? "secondary" : "outline"}
          size="sm"
          className={`h-7 text-xs gap-1 rounded-lg border-border/50 bg-transparent shadow-none ${
            hasSelection ? "bg-secondary" : ""
          }`}
        >
          Assignee
          {hasSelection && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full"
            >
              {isExclusionMode ? excludedIds.length : selectedIds.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
          <span className="text-xs font-medium">Assignee</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleModeToggle}
          >
            {isExclusionMode ? "Exclude" : "Include"}
          </Button>
        </div>
        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {users.map((opt) => {
            const isChecked = isExclusionMode
              ? excludedIds.includes(opt._id)
              : selectedIds.includes(opt._id);
            const label = opt.name ?? opt.email ?? "Unknown";
            return (
              <label
                key={opt._id}
                className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => handleToggle(opt._id)}
                />
                <span
                  className={`text-xs ${isExclusionMode && isChecked ? "line-through text-muted-foreground" : ""}`}
                >
                  {label}
                </span>
              </label>
            );
          })}
        </div>
        {hasSelection && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-7 text-xs text-muted-foreground"
            onClick={() => {
              if (isExclusionMode) {
                onFiltersChange({ ...filters, excludeAssigneeIds: [] });
              } else {
                onFiltersChange({ ...filters, assigneeIds: undefined });
              }
            }}
          >
            Clear Assignee
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function TagFilterDropdown({
  filters,
  onFiltersChange,
}: {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}) {
  const tags = useQuery(api.tags.list) ?? [];
  const selectedIds = filters.tagIds ?? [];
  const excludedIds = filters.excludeTagIds ?? [];
  const isExclusionMode = excludedIds.length > 0;
  const hasSelection = selectedIds.length > 0 || isExclusionMode;

  const handleToggle = (id: Id<"tags">) => {
    if (isExclusionMode) {
      const newExcluded = excludedIds.includes(id)
        ? excludedIds.filter((i) => i !== id)
        : [...excludedIds, id];
      onFiltersChange({ ...filters, excludeTagIds: newExcluded });
    } else {
      const newSelected = selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id];
      onFiltersChange({
        ...filters,
        tagIds: newSelected.length ? newSelected : undefined,
      });
    }
  };

  const handleModeToggle = () => {
    if (isExclusionMode) {
      onFiltersChange({
        ...filters,
        tagIds: excludedIds.length > 0 ? excludedIds : undefined,
        excludeTagIds: [],
      });
    } else {
      onFiltersChange({
        ...filters,
        tagIds: [],
        excludeTagIds: selectedIds.length > 0 ? selectedIds : [],
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasSelection ? "secondary" : "outline"}
          size="sm"
          className={`h-7 text-xs gap-1 rounded-lg border-border/50 bg-transparent shadow-none ${
            hasSelection ? "bg-secondary" : ""
          }`}
        >
          Tag
          {hasSelection && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full"
            >
              {isExclusionMode ? excludedIds.length : selectedIds.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
          <span className="text-xs font-medium">Tag</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleModeToggle}
          >
            {isExclusionMode ? "Exclude" : "Include"}
          </Button>
        </div>
        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {tags.map((opt) => {
            const isChecked = isExclusionMode
              ? excludedIds.includes(opt._id)
              : selectedIds.includes(opt._id);
            return (
              <label
                key={opt._id}
                className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => handleToggle(opt._id)}
                />
                {opt.color && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                <span
                  className={`text-xs ${isExclusionMode && isChecked ? "line-through text-muted-foreground" : ""}`}
                >
                  {opt.name}
                </span>
              </label>
            );
          })}
        </div>
        {hasSelection && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-7 text-xs text-muted-foreground"
            onClick={() => {
              if (isExclusionMode) {
                onFiltersChange({ ...filters, excludeTagIds: [] });
              } else {
                onFiltersChange({ ...filters, tagIds: undefined });
              }
            }}
          >
            Clear Tag
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function TaskFilters({
  filters,
  onFiltersChange,
}: {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}) {
  const activeFilterCount =
    (filters.stateIds?.length ?? 0) +
    (filters.excludeStateIds?.length ?? 0) +
    (filters.priorityIds?.length ?? 0) +
    (filters.excludePriorityIds?.length ?? 0) +
    (filters.projectIds?.length ?? 0) +
    (filters.excludeProjectIds?.length ?? 0) +
    (filters.assigneeIds?.length ?? 0) +
    (filters.excludeAssigneeIds?.length ?? 0) +
    (filters.tagIds?.length ?? 0) +
    (filters.excludeTagIds?.length ?? 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-primary mr-1">
        <Filter className="h-3.5 w-3.5" />
        <span className="text-[11px] uppercase tracking-wider font-medium">
          Filter
        </span>
      </div>

      <StateFilterDropdown
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
      <PriorityFilterDropdown
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
      <ProjectFilterDropdown
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
      <AssigneeFilterDropdown
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
      <TagFilterDropdown filters={filters} onFiltersChange={onFiltersChange} />

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground rounded-lg"
          onClick={() => onFiltersChange({})}
        >
          <X className="h-3 w-3" />
          Clear
          <Badge className="ml-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full bg-primary text-primary-foreground">
            {activeFilterCount}
          </Badge>
        </Button>
      )}
    </div>
  );
}
