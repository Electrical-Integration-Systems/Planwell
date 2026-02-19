"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Eye, Trash2, Plus, UserPlus, Archive, ArchiveRestore, Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export const TASK_GRID_COLS = "1fr 150px 140px 130px 110px 100px 85px 85px 48px";

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

type SortKey = {
  column: string;
  direction: "asc" | "desc";
};

const PAGE_SIZE = 50;

export function TaskList({
  filters,
  sortKeys,
  onTaskSelect,
  isAddingTask,
  onIsAddingTaskChange,
  archived = false,
  searchQuery = "",
}: {
  filters: Filters;
  sortKeys: SortKey[];
  onTaskSelect: (id: Id<"tasks">) => void;
  isAddingTask: boolean;
  onIsAddingTaskChange: (v: boolean) => void;
  archived?: boolean;
  searchQuery?: string;
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);

  const result = useQuery(api.tasks.list, {
    archived,
    projectIds: filters.projectIds,
    excludeProjectIds: filters.excludeProjectIds,
    stateIds: filters.stateIds,
    excludeStateIds: filters.excludeStateIds,
    priorityIds: filters.priorityIds,
    excludePriorityIds: filters.excludePriorityIds,
    assigneeIds: filters.assigneeIds,
    excludeAssigneeIds: filters.excludeAssigneeIds,
    tagIds: filters.tagIds,
    excludeTagIds: filters.excludeTagIds,
    limit,
  });

  const states = useQuery(api.taskStates.list) ?? [];
  const priorities = useQuery(api.priorities.list) ?? [];
  const projects = useQuery(api.projects.list, {}) ?? [];
  const users = useQuery(api.users.list) ?? [];
  const updateTask = useMutation(api.tasks.update);
  const createTask = useMutation(api.tasks.create);
  const removeTask = useMutation(api.tasks.remove);
  const archiveTask = useMutation(api.tasks.archive);
  const unarchiveTask = useMutation(api.tasks.unarchive);

  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Infinite scroll: observe sentinel, load more by increasing limit
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = result !== undefined && result.tasks.length < result.totalCount;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLimit((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  const handleQuickCreate = () => {
    try {
      const title = newTaskTitle.trim() || "Untitled task";
      const defaultState = states[0]?._id;
      const defaultPriority = priorities[0]?._id;

      if (!defaultState || !defaultPriority) return;

      void createTask({
        title,
        stateId: defaultState,
        priorityId: defaultPriority,
        projectId: projects[0]?._id,
        assignees: [],
        tagIds: [],
      }).then((taskId) => {
        setNewTaskTitle("");
        onIsAddingTaskChange(false);
        onTaskSelect(taskId);
      });
    } catch (error) {
      console.log(error);
    }
  };

  if (result === undefined) {
    return (
      <div className="py-16 text-center">
        <p className="text-xs text-muted-foreground animate-subtle-pulse">
          Loading tasks...
        </p>
      </div>
    );
  }

  const tasks = result.tasks;

  // Client-side search filter
  const lowerSearch = searchQuery.toLowerCase().trim();
  const searchedTasks = lowerSearch
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(lowerSearch) ||
          t.state?.name.toLowerCase().includes(lowerSearch) ||
          t.priority?.name.toLowerCase().includes(lowerSearch) ||
          t.project?.name.toLowerCase().includes(lowerSearch) ||
          t.assigneeUsers.some(
            (u) =>
              u.name?.toLowerCase().includes(lowerSearch) ||
              u.email?.toLowerCase().includes(lowerSearch),
          ) ||
          t.tagList.some((tag) => tag.name.toLowerCase().includes(lowerSearch)),
      )
    : tasks;

  // Apply client-side multi-column sorting
  const sortedTasks = [...searchedTasks].sort((a, b) => {
    for (const key of sortKeys) {
      let cmp = 0;
      const dir = key.direction === "asc" ? 1 : -1;
      switch (key.column) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "state":
          cmp = (a.state?.order ?? 0) - (b.state?.order ?? 0);
          break;
        case "priority":
          cmp = (a.priority?.order ?? 0) - (b.priority?.order ?? 0);
          break;
        case "project":
          cmp = (a.project?.name ?? "").localeCompare(b.project?.name ?? "");
          break;
        case "createdAt":
          cmp = a.createdAt - b.createdAt;
          break;
        case "updatedAt":
          cmp = a.updatedAt - b.updatedAt;
          break;
      }
      if (cmp !== 0) return cmp * dir;
    }
    return 0;
  });

  if (sortedTasks.length === 0 && !isAddingTask) {
    return (
      <div className="flex flex-col items-center">
        <div className="py-16 text-center border border-dashed border-primary/30 rounded-lg w-full bg-primary/5">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            {archived ? (
              <Archive className="h-5 w-5 text-primary/60" />
            ) : (
              <Plus className="h-5 w-5 text-primary/60" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {archived ? "No archived tasks" : "No tasks found"}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {archived
              ? "Archived tasks will appear here"
              : "Create a task to get started"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Inline add task row */}
      {isAddingTask && !archived && (
        <div className="flex items-center gap-2 py-2 px-2 border-b border-border/50">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Task title (or leave blank for 'Untitled task')"
            className="h-8 text-sm border-border/50 bg-transparent shadow-none flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleQuickCreate();
              if (e.key === "Escape") {
                onIsAddingTaskChange(false);
                setNewTaskTitle("");
              }
            }}
          />
          <Button
            size="sm"
            className="h-8 text-xs px-3 rounded-lg"
            onClick={handleQuickCreate}
          >
            Add
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs px-2 rounded-lg text-muted-foreground"
            onClick={() => {
              onIsAddingTaskChange(false);
              setNewTaskTitle("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Task rows */}
      {sortedTasks.map((task, index) => (
        <div
          key={task._id}
          className="grid items-center py-2.5 border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/50 animate-fade-in"
          style={{
            gridTemplateColumns: TASK_GRID_COLS,
            animationDelay: `${Math.min(index, 20) * 25}ms`,
          }}
          onClick={() => onTaskSelect(task._id)}
        >
          <div className="font-medium text-sm truncate pr-2">
            {task.title}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={task.stateId}
              onValueChange={(val) => {
                void updateTask({
                  id: task._id,
                  stateId: val as Id<"taskStates">,
                });
              }}
            >
              <SelectTrigger className="h-7 text-xs w-[140px] border-border/50 bg-transparent shadow-none overflow-hidden">
                <span
                  className="flex items-center gap-1.5 truncate"
                  title={task.state?.name}
                >
                  {task.state?.color && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: task.state.color }}
                    />
                  )}
                  {task.state?.name}
                </span>
              </SelectTrigger>
              <SelectContent position="popper">
                {states.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    <span className="flex items-center gap-2">
                      {s.color && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                      )}
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={task.priorityId}
              onValueChange={(val) => {
                void updateTask({
                  id: task._id,
                  priorityId: val as Id<"priorities">,
                });
              }}
            >
              <SelectTrigger className="h-7 text-xs w-[130px] border-border/50 bg-transparent shadow-none overflow-hidden">
                <span
                  className="flex items-center gap-1.5 truncate"
                  title={task.priority?.name}
                >
                  {task.priority?.color && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: task.priority.color }}
                    />
                  )}
                  {task.priority?.name}
                </span>
              </SelectTrigger>
              <SelectContent position="popper">
                {priorities.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    <span className="flex items-center gap-2">
                      {p.color && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                      )}
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground truncate pr-2" title={task.project?.name ?? "\u2014"}>
            {task.project?.name ?? "\u2014"}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 hover:opacity-70 transition-opacity">
                  {task.assigneeUsers.length > 0 ? (
                    <div className="flex items-center -space-x-1">
                      {task.assigneeUsers.map((u, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-[10px] font-medium text-primary-foreground ring-2 ring-card"
                          title={u.name ?? u.email ?? "?"}
                        >
                          {(u.name ?? u.email ?? "?").charAt(0).toUpperCase()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground text-xs">
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Assign</span>
                    </div>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="start">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Assignees
                  </p>
                  {users.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-2 py-1"
                    >
                      <Checkbox
                        id={`assignee-${task._id}-${user._id}`}
                        checked={task.assignees.includes(user._id)}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...task.assignees, user._id]
                            : task.assignees.filter((id) => id !== user._id);
                          void updateTask({
                            id: task._id,
                            assignees: next,
                          });
                        }}
                      />
                      <label
                        htmlFor={`assignee-${task._id}-${user._id}`}
                        className="text-xs cursor-pointer flex-1 truncate"
                      >
                        {user.name ?? user.email ?? "?"}
                      </label>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="text-xs text-muted-foreground/50">
                      No users available
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-wrap gap-1">
            {task.tagList.map((tag) => (
              <Badge
                key={tag._id}
                variant="outline"
                className="text-[10px] h-5 px-1.5 border-current/20 font-medium"
                style={{ color: tag.color }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {new Date(task.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {new Date(task.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => onTaskSelect(task._id)}
                  className="gap-2 text-xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View details
                </DropdownMenuItem>
                {archived ? (
                  <DropdownMenuItem
                    className="gap-2 text-xs"
                    onClick={() => {
                      void unarchiveTask({ id: task._id });
                    }}
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" />
                    Unarchive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="gap-2 text-xs"
                    onClick={() => {
                      void archiveTask({ id: task._id });
                    }}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive gap-2 text-xs"
                  onClick={() => {
                    void removeTask({ id: task._id });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />
      {hasMore && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground ml-2">Loading more...</span>
        </div>
      )}

      {/* Total count */}
      <div className="py-2 border-t border-border/40 text-[11px] text-muted-foreground/60">
        {sortedTasks.length} of {result.totalCount} tasks
        {searchQuery && ` (filtered by "${searchQuery}")`}
      </div>
    </div>
  );
}
