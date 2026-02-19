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
import { Badge } from "@/components/ui/badge";
import type { Id } from "@/convex/_generated/dataModel";

export function CreateTaskDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const states = useQuery(api.taskStates.list) ?? [];
  const priorities = useQuery(api.priorities.list) ?? [];
  const projects = useQuery(api.projects.list, {}) ?? [];
  const users = useQuery(api.users.list) ?? [];
  const tags = useQuery(api.tags.list) ?? [];
  const createTask = useMutation(api.tasks.create);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stateId, setStateId] = useState<Id<"taskStates"> | "">("");
  const [priorityId, setPriorityId] = useState<Id<"priorities"> | "">("");
  const [projectId, setProjectId] = useState<Id<"projects"> | "">("");
  const [selectedAssignees, setSelectedAssignees] = useState<Id<"users">[]>([]);
  const [selectedTags, setSelectedTags] = useState<Id<"tags">[]>([]);

  // Auto-select first values when data loads
  const effectiveStateId = stateId || (states[0]?._id ?? "");
  const effectivePriorityId = priorityId || (priorities[0]?._id ?? "");

  const handleSubmit = () => {
    if (
      !title.trim() ||
      !effectiveStateId ||
      !effectivePriorityId
    )
      return;

    void createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      stateId: effectiveStateId as Id<"taskStates">,
      priorityId: effectivePriorityId as Id<"priorities">,
      projectId: projectId || undefined,
      assignees: selectedAssignees,
      tagIds: selectedTags,
    }).then(() => {
      setTitle("");
      setDescription("");
      setStateId("");
      setPriorityId("");
      setProjectId("");
      setSelectedAssignees([]);
      setSelectedTags([]);
      onOpenChange(false);
    });
  };

  const toggleAssignee = (userId: Id<"users">) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const toggleTag = (tagId: Id<"tags">) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const canCreate =
    title.trim() &&
    effectiveStateId &&
    effectivePriorityId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border/60 shadow-warm-lg">
        <div className="h-1 -mx-6 -mt-6 mb-3 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent rounded-t-lg" />
        <DialogHeader className="pb-1">
          <DialogTitle className="font-serif text-xl font-semibold">
            Create Task
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Add a new task to your workspace
          </p>
        </DialogHeader>
        <div className="flex flex-col gap-5 pt-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="title"
              className="text-xs font-medium uppercase tracking-wider text-primary flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="h-10 border-border/50 bg-transparent shadow-none focus-visible:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="description"
              className="text-xs font-medium uppercase tracking-wider text-primary flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="border-border/50 bg-transparent shadow-none resize-none focus-visible:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                State
              </Label>
              <Select
                value={effectiveStateId}
                onValueChange={(val) => setStateId(val as Id<"taskStates">)}
              >
                <SelectTrigger className="h-9 text-sm border-border/50 bg-transparent shadow-none rounded-lg">
                  <SelectValue placeholder="Select" />
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
              <Label className="text-xs font-medium uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Priority
              </Label>
              <Select
                value={effectivePriorityId}
                onValueChange={(val) => setPriorityId(val as Id<"priorities">)}
              >
                <SelectTrigger className="h-9 text-sm border-border/50 bg-transparent shadow-none rounded-lg">
                  <SelectValue placeholder="Select" />
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
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                Project
              </Label>
              <Select
                value={projectId}
                onValueChange={(val) => setProjectId(val as Id<"projects">)}
              >
                <SelectTrigger className="h-9 text-sm border-border/50 bg-transparent shadow-none rounded-lg">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Assignees
            </Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {users.map((u) => (
                <Button
                  key={u._id}
                  variant={
                    selectedAssignees.includes(u._id) ? "default" : "outline"
                  }
                  size="sm"
                  className="h-7 text-xs rounded-full px-3 border-border/50 shadow-none"
                  onClick={() => toggleAssignee(u._id)}
                >
                  {u.name ?? u.email ?? "?"}
                </Button>
              ))}
              {users.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No users available
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Tags
            </Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tags.map((t) => (
                <Badge
                  key={t._id}
                  variant={selectedTags.includes(t._id) ? "default" : "outline"}
                  className="cursor-pointer h-7 text-xs px-3 rounded-full transition-colors"
                  style={
                    selectedTags.includes(t._id)
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
                <p className="text-xs text-muted-foreground">
                  No tags available. Create tags in Settings.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-lg text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canCreate}
              className="rounded-lg shadow-warm-sm hover:shadow-warm transition-shadow text-sm px-5"
            >
              Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
