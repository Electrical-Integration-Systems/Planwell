"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { MoreHorizontal, Eye, Trash2, Plus, UserPlus } from "lucide-react";
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

type SortKey = {
  column: string;
  direction: "asc" | "desc";
};

export function TaskList({
  filters,
  sortKeys,
  onTaskSelect,
  isAddingTask,
  onIsAddingTaskChange,
}: {
  filters: Filters;
  sortKeys: SortKey[];
  onTaskSelect: (id: Id<"tasks">) => void;
  isAddingTask: boolean;
  onIsAddingTaskChange: (v: boolean) => void;
}) {
  const tasks = useQuery(api.tasks.list, {
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
  });
  const states = useQuery(api.taskStates.list) ?? [];
  const priorities = useQuery(api.priorities.list) ?? [];
  const projects = useQuery(api.projects.list, {}) ?? [];
  const users = useQuery(api.users.list) ?? [];
  const updateTask = useMutation(api.tasks.update);
  const createTask = useMutation(api.tasks.create);
  const removeTask = useMutation(api.tasks.remove);

  const [newTaskTitle, setNewTaskTitle] = useState("");

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
    }
    catch (error) {
      console.log(error);
    }
  };

  if (tasks === undefined) {
    return (
      <div className="py-16 text-center">
        <p className="text-xs text-muted-foreground animate-subtle-pulse">
          Loading tasks...
        </p>
      </div>
    );
  }

  // Apply client-side multi-column sorting
  const sortedTasks = [...tasks].sort((a, b) => {
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
            <Plus className="h-5 w-5 text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground">No tasks found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Create a task to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card shadow-warm-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-b-2 border-primary/20 hover:bg-transparent">
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Title
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              State
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Priority
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Project
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Assignees
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tags
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Created
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Updated
            </TableHead>
            <TableHead className="w-[44px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Inline add task row — at top so it's always visible */}
          {isAddingTask && (
            <TableRow className="border-border/50">
              <TableCell colSpan={9} className="py-2">
                <div className="flex items-center gap-2">
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
              </TableCell>
            </TableRow>
          )}

          {sortedTasks.map((task, index) => (
            <TableRow
              key={task._id}
              className="task-row cursor-pointer border-border/50 animate-fade-in"
              style={{ animationDelay: `${index * 25}ms` }}
              onClick={() => onTaskSelect(task._id)}
            >
              <TableCell className="font-medium text-sm py-2.5">
                {task.title}
              </TableCell>
              <TableCell
                onClick={(e) => e.stopPropagation()}
                className="py-2.5 relative"
              >
                <div className="relative">
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
              </TableCell>
              <TableCell
                onClick={(e) => e.stopPropagation()}
                className="py-2.5 relative"
              >
                <div className="relative">
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
              </TableCell>
              <TableCell className="text-sm text-muted-foreground py-2.5">
                <span className="block truncate max-w-[220px]" title={task.project?.name ?? "\u2014"}>
                  {task.project?.name ?? "\u2014"}
                </span>
              </TableCell>
              <TableCell
                onClick={(e) => e.stopPropagation()}
                className="text-sm py-2.5"
              >
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
              </TableCell>
              <TableCell className="py-2.5">
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
              </TableCell>
              <TableCell className="text-xs text-muted-foreground tabular-nums py-2.5">
                {new Date(task.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground tabular-nums py-2.5">
                {new Date(task.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell
                onClick={(e) => e.stopPropagation()}
                className="py-2.5"
              >
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
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      onClick={() => onTaskSelect(task._id)}
                      className="gap-2 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View details
                    </DropdownMenuItem>
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
