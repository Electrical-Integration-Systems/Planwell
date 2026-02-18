"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Trash2, Clock, History } from "lucide-react";
import { TaskAuditTimeline } from "@/components/AuditHistoryDialog";
import type { Id } from "@/convex/_generated/dataModel";

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: Id<"tasks">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const task = useQuery(api.tasks.get, { id: taskId });
  const taskUpdates = useQuery(api.updates.list, { taskId });
  const states = useQuery(api.taskStates.list) ?? [];
  const priorities = useQuery(api.priorities.list) ?? [];
  const projects = useQuery(api.projects.list, {}) ?? [];
  const users = useQuery(api.users.list) ?? [];
  const tags = useQuery(api.tags.list) ?? [];
  const updateTask = useMutation(api.tasks.update);
  const createUpdate = useMutation(api.updates.create);
  const removeUpdate = useMutation(api.updates.remove);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const [updateBody, setUpdateBody] = useState("");

  if (task === undefined || task === null) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm py-12 text-center">
            Loading...
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const handleTitleSave = () => {
    if (titleValue.trim()) {
      void updateTask({ id: taskId, title: titleValue.trim() });
    }
    setEditingTitle(false);
  };

  const handleDescSave = () => {
    void updateTask({ id: taskId, description: descValue.trim() || undefined });
    setEditingDesc(false);
  };

  const handleAddUpdate = () => {
    if (!updateBody.trim()) return;
    void createUpdate({ taskId, body: updateBody.trim() }).then(() => {
      setUpdateBody("");
    });
  };

  const toggleAssignee = (userId: Id<"users">) => {
    const current = task.assignees;
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    void updateTask({ id: taskId, assignees: next });
  };

  const toggleTag = (tagId: Id<"tags">) => {
    const current = task.tagIds;
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    void updateTask({ id: taskId, tagIds: next });
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatRelative = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const d = new Date(ts);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=" !max-w-[80vw] h-[80vh] p-0 gap-0 flex flex-col overflow-hidden shadow-warm-lg border-border/60">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-primary/20 shrink-0 bg-primary/[0.03]">
          <div className="h-1 -mx-6 -mt-5 mb-4 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
          <DialogTitle className="pr-8">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  className="text-lg font-serif h-9 border-border/50 shadow-none"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-8 text-xs rounded-lg"
                  onClick={handleTitleSave}
                >
                  Save
                </Button>
              </div>
            ) : (
              <span
                className="font-serif text-xl tracking-tight cursor-pointer hover:text-primary transition-colors"
                onClick={() => {
                  setTitleValue(task.title);
                  setEditingTitle(true);
                }}
              >
                {task.title}
              </span>
            )}
          </DialogTitle>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
            <span>Created {formatTimestamp(task.createdAt)}</span>
            <span className="text-border">|</span>
            <span>Updated {formatTimestamp(task.updatedAt)}</span>
          </div>
        </DialogHeader>

        {/* Tabbed content: Details | Audit */}
        <Tabs defaultValue="details" className="flex-1 min-h-0 flex flex-col">
          <TabsList variant="line" className="px-6 pt-1 border-b border-border/30 shrink-0">
            <TabsTrigger value="details" className="text-xs gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Details
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs gap-1.5">
              <History className="h-3.5 w-3.5" />
              Audit
            </TabsTrigger>
          </TabsList>

          {/* Details Tab - Original split pane */}
          <TabsContent value="details" className="flex-1 min-h-0">
            <div className="flex flex-1 min-h-0 h-full">
              {/* Left pane - Description & Fields */}
              <div className="w-[520px] flex flex-col border-r border-border/50 shrink-0">
                <ScrollArea className="flex-1">
                  <div className="p-6 flex flex-col gap-5">
                    {/* Description */}
                    <div>
                      <Label className="text-[11px] font-medium uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Description
                      </Label>
                      {editingDesc ? (
                        <div className="flex flex-col gap-2 mt-2">
                          <Textarea
                            value={descValue}
                            onChange={(e) => setDescValue(e.target.value)}
                            rows={8}
                            className="border-border/50 bg-transparent shadow-none resize-none text-sm leading-relaxed"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs rounded-lg"
                              onClick={handleDescSave}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs rounded-lg text-muted-foreground"
                              onClick={() => setEditingDesc(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="mt-2 text-sm leading-relaxed cursor-pointer hover:bg-accent/50 rounded-lg p-3 -mx-3 transition-colors min-h-[80px]"
                          onClick={() => {
                            setDescValue(task.description ?? "");
                            setEditingDesc(true);
                          }}
                        >
                          {task.description ? (
                            <p className="whitespace-pre-wrap">
                              {task.description}
                            </p>
                          ) : (
                            <p className="text-muted-foreground/50 italic">
                              Click to add a description...
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Fields grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          State
                        </Label>
                        <Select
                          value={task.stateId}
                          onValueChange={(val) => {
                            void updateTask({
                              id: taskId,
                              stateId: val as Id<"taskStates">,
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs border-border/50 bg-transparent shadow-none rounded-lg w-full" title={task.state?.name}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((s) => (
                              <SelectItem key={s._id} value={s._id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Priority
                        </Label>
                        <Select
                          value={task.priorityId}
                          onValueChange={(val) => {
                            void updateTask({
                              id: taskId,
                              priorityId: val as Id<"priorities">,
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs border-border/50 bg-transparent shadow-none rounded-lg w-full" title={task.priority?.name}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {priorities.map((p) => (
                              <SelectItem key={p._id} value={p._id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Project
                        </Label>
                        <Select
                          value={task.projectId ?? "__none__"}
                          onValueChange={(val) => {
                            void updateTask({
                              id: taskId,
                              projectId: val === "__none__" ? undefined : val as Id<"projects">,
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs border-border/50 bg-transparent shadow-none rounded-lg w-full" title={task.projectId ? projects.find(p => p._id === task.projectId)?.name : "N/A"}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              N/A
                            </SelectItem>
                            {projects.map((p) => (
                              <SelectItem key={p._id} value={p._id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Assignees */}
                    <div>
                      <Label className="text-[11px] font-medium uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Assignees
                      </Label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {users.map((u) => (
                          <Button
                            key={u._id}
                            variant={
                              task.assignees.includes(u._id) ? "default" : "outline"
                            }
                            size="sm"
                            className="h-7 text-xs rounded-full px-3 border-border/50 shadow-none"
                            onClick={() => toggleAssignee(u._id)}
                          >
                            {u.name ?? u.email ?? "?"}
                          </Button>
                        ))}
                        {users.length === 0 && (
                          <p className="text-xs text-muted-foreground/50">
                            No users
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <Label className="text-[11px] font-medium uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Tags
                      </Label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tags.map((t) => (
                          <Badge
                            key={t._id}
                            variant={
                              task.tagIds.includes(t._id) ? "default" : "outline"
                            }
                            className="cursor-pointer h-7 text-xs px-3 rounded-full transition-colors"
                            style={
                              task.tagIds.includes(t._id)
                                ? {
                                  backgroundColor: t.color,
                                  borderColor: t.color,
                                  color: "#fff",
                                }
                                : { borderColor: t.color, color: t.color }
                            }
                            onClick={() => toggleTag(t._id)}
                          >
                            {t.name}
                          </Badge>
                        ))}
                        {tags.length === 0 && (
                          <p className="text-xs text-muted-foreground/50">
                            No tags. Create tags in Settings.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* Right pane - Updates */}
              <div className="flex-1 flex flex-col bg-muted/30">
                <div className="px-4 py-3 border-b border-primary/20 shrink-0">
                  <h3 className="text-xs font-mediumuppercase tracking-wider text-primary flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Updates
                  </h3>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4 flex flex-col gap-3">
                    {taskUpdates?.length === 0 && (
                      <div className="py-8 text-center">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                          <Clock className="h-5 w-5 text-primary/40" />
                        </div>
                        <p className="text-xs text-muted-foreground/50">
                          No updates yet
                        </p>
                      </div>
                    )}
                    {taskUpdates?.map((update) => (
                      <div
                        key={update._id}
                        className="bg-card rounded-lg p-3 border border-border/40 shadow-warm-sm animate-fade-in"
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-[9px] font-medium text-primary-foreground shrink-0">
                              {(update.user?.name ?? update.user?.email ?? "?")
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                            <span className="text-xs font-medium truncate">
                              {update.user?.name ?? update.user?.email ?? "Unknown"}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded text-muted-foreground/40 hover:text-destructive shrink-0"
                            onClick={() => {
                              void removeUpdate({ id: update._id });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {update.body}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 mt-2">
                          {formatRelative(update.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Add update input */}
                <div className="p-3 border-t border-border/50 shrink-0">
                  <div className="flex gap-2">
                    <Textarea
                      value={updateBody}
                      onChange={(e) => setUpdateBody(e.target.value)}
                      placeholder="Write an update..."
                      rows={2}
                      className="flex-1 text-sm border-border/50 bg-card shadow-none resize-none rounded-lg"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          handleAddUpdate();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      className="h-8 w-8 rounded-lg self-end shrink-0"
                      onClick={handleAddUpdate}
                      disabled={!updateBody.trim()}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-medium uppercase tracking-wider text-primary">
                    Task Audit Log
                  </h3>
                </div>
                <TaskAuditTimeline taskId={taskId} />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
