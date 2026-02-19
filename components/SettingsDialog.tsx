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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { ColorPicker } from "@/components/ColorPicker";

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

export function SettingsDialog({
  open,
  onOpenChange,
  currentFilters,
  currentSortKeys,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters?: Filters;
  currentSortKeys?: SortKey[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-2xl max-h-[90dvh] sm:max-h-[80vh] shadow-warm-lg border-border/60">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl tracking-tight flex items-center gap-2">
            Settings
            <span className="h-1 flex-1 rounded-full bg-gradient-to-r from-primary/40 to-transparent" />
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="states">
          <TabsList className="flex w-full overflow-x-auto bg-transparent border-b border-border">
            <TabsTrigger
              value="states"
              className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent"
            >
              States
            </TabsTrigger>
            <TabsTrigger
              value="priorities"
              className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent"
            >
              Priorities
            </TabsTrigger>
            <TabsTrigger
              value="tags"
              className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent"
            >
              Tags
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent"
            >
              Projects
            </TabsTrigger>
            <TabsTrigger
              value="presets"
              className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent"
            >
              Presets
            </TabsTrigger>
          </TabsList>
          <TabsContent value="states">
            <StatesTab />
          </TabsContent>
          <TabsContent value="priorities">
            <PrioritiesTab />
          </TabsContent>
          <TabsContent value="tags">
            <TagsTab />
          </TabsContent>
          <TabsContent value="projects">
            <ProjectsTab />
          </TabsContent>
          <TabsContent value="presets">
            <PresetsTab currentFilters={currentFilters ?? {}} currentSortKeys={currentSortKeys ?? []} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatesTab() {
  const states = useQuery(api.taskStates.list) ?? [];
  const createState = useMutation(api.taskStates.create);
  const updateState = useMutation(api.taskStates.update);
  const removeState = useMutation(api.taskStates.remove);
  const reorderStates = useMutation(api.taskStates.reorder);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [editingId, setEditingId] = useState<Id<"taskStates"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    void createState({ name: newName.trim(), color: newColor }).then(() => {
      setNewName("");
      setNewColor("#6b7280");
    });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    void updateState({
      id: editingId,
      name: editName.trim(),
      color: editColor,
    }).then(() => {
      setEditingId(null);
      setEditName("");
    });
  };

  const handleRemove = (id: Id<"taskStates">) => {
    setError(null);
    void removeState({ id }).catch((e: Error) => setError(e.message));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const ids = states.map((s) => s._id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    void reorderStates({ ids });
  };

  const handleMoveDown = (index: number) => {
    if (index >= states.length - 1) return;
    const ids = states.map((s) => s._id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    void reorderStates({ ids });
  };

  return (
    <div className="flex flex-col gap-2 py-3">
      {error && <p className="text-xs text-destructive">{error}</p>}
      {states.map((state, index) => (
        <div key={state._id} className="flex items-center gap-1.5 group">
          {editingId === state._id ? (
            <>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 h-8 text-sm border-border/50 shadow-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
              />
              <ColorPicker
                value={editColor}
                onChange={(color) => setEditColor(color)}
              />
              <Button
                size="sm"
                className="h-7 text-xs rounded-lg"
                onClick={handleSaveEdit}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs rounded-lg text-muted-foreground"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: state.color }}
              />
              <span className="flex-1 text-sm">{state.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground/50 hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground/50 hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => handleMoveDown(index)}
                disabled={index === states.length - 1}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground/50 hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  setEditingId(state._id);
                  setEditName(state.name);
                  setEditColor(state.color || "#6b7280");
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground/50 hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(state._id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ))}
      <Separator className="my-1" />
      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New state name"
          className="flex-1 h-8 text-sm border-border/50 shadow-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <ColorPicker
          value={newColor}
          onChange={(color) => setNewColor(color)}
        />
        <Button
          size="sm"
          className="h-8 text-xs rounded-lg gap-1"
          onClick={handleCreate}
          disabled={!newName.trim()}
        >
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>
    </div>
  );
}

function PrioritiesTab() {
  const priorities = useQuery(api.priorities.list) ?? [];
  const createPriority = useMutation(api.priorities.create);
  const updatePriority = useMutation(api.priorities.update);
  const removePriority = useMutation(api.priorities.remove);
  const reorderPriorities = useMutation(api.priorities.reorder);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#eab308");
  const [editingId, setEditingId] = useState<Id<"priorities"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    void createPriority({ name: newName.trim(), color: newColor }).then(() => {
      setNewName("");
      setNewColor("#eab308");
    });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    void updatePriority({
      id: editingId,
      name: editName.trim(),
      color: editColor,
    }).then(() => {
      setEditingId(null);
      setEditName("");
    });
  };

  const handleRemove = (id: Id<"priorities">) => {
    setError(null);
    void removePriority({ id }).catch((e: Error) => setError(e.message));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const ids = priorities.map((p) => p._id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    void reorderPriorities({ ids });
  };

  const handleMoveDown = (index: number) => {
    if (index >= priorities.length - 1) return;
    const ids = priorities.map((p) => p._id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    void reorderPriorities({ ids });
  };

  return (
    <div className="flex flex-col gap-2 py-3">
      {error && <p className="text-xs text-destructive">{error}</p>}
      {priorities.map((priority, index) => (
        <div key={priority._id} className="flex items-center gap-1.5 group">
          {editingId === priority._id ? (
            <>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 h-8 text-sm border-border/50 shadow-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
              />
              <ColorPicker
                value={editColor}
                onChange={(color) => setEditColor(color)}
              />
              <Button
                size="sm"
                className="h-7 text-xs rounded-lg"
                onClick={handleSaveEdit}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs rounded-lg text-muted-foreground"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: priority.color }}
              />
              <span className="flex-1 text-sm">{priority.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground/50 hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground/50 hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => handleMoveDown(index)}
                disabled={index === priorities.length - 1}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground/50 hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  setEditingId(priority._id);
                  setEditName(priority.name);
                  setEditColor(priority.color || "#eab308");
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground/50 hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(priority._id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ))}
      <Separator className="my-1" />
      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New priority name"
          className="flex-1 h-8 text-sm border-border/50 shadow-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <ColorPicker
          value={newColor}
          onChange={(color) => setNewColor(color)}
        />
        <Button
          size="sm"
          className="h-8 text-xs rounded-lg gap-1"
          onClick={handleCreate}
          disabled={!newName.trim()}
        >
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>
    </div>
  );
}

function TagsTab() {
  const tags = useQuery(api.tags.list) ?? [];
  const createTag = useMutation(api.tags.create);
  const updateTag = useMutation(api.tags.update);
  const removeTag = useMutation(api.tags.remove);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [editingId, setEditingId] = useState<Id<"tags"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    void createTag({ name: newName.trim(), color: newColor }).then(() => {
      setNewName("");
      setNewColor("#3b82f6");
    });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    void updateTag({
      id: editingId,
      name: editName.trim(),
      color: editColor,
    }).then(() => {
      setEditingId(null);
    });
  };

  return (
    <div className="flex flex-col gap-2 py-3">
      {tags.map((tag) => (
        <div key={tag._id} className="flex items-center gap-2 group">
          {editingId === tag._id ? (
            <>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 h-8 text-sm border-border/50 shadow-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
              />
              <ColorPicker
                value={editColor}
                onChange={(color) => setEditColor(color)}
              />
              <Button
                size="sm"
                className="h-7 text-xs rounded-lg"
                onClick={handleSaveEdit}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs rounded-lg text-muted-foreground"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span className="flex-1 text-sm">{tag.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground/50 hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  setEditingId(tag._id);
                  setEditName(tag.name);
                  setEditColor(tag.color);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground/50 hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  void removeTag({ id: tag._id });
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ))}
      <Separator className="my-1" />
      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New tag name"
          className="flex-1 h-8 text-sm border-border/50 shadow-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <ColorPicker
          value={newColor}
          onChange={(color) => setNewColor(color)}
        />
        <Button
          size="sm"
          className="h-8 text-xs rounded-lg gap-1"
          onClick={handleCreate}
          disabled={!newName.trim()}
        >
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>
    </div>
  );
}

function ProjectsTab() {
  const projects = useQuery(api.projects.list, { includeArchived: true }) ?? [];
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const archiveProject = useMutation(api.projects.archive);
  const unarchiveProject = useMutation(api.projects.unarchive);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<Id<"projects"> | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    void createProject({ name: newName.trim() }).then(() => setNewName(""));
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    void updateProject({ id: editingId, name: editName.trim() }).then(() => {
      setEditingId(null);
    });
  };

  return (
    <div className="flex flex-col gap-2 py-3">
      {projects.map((project) => (
        <div key={project._id} className="flex items-center gap-2 group">
          {editingId === project._id ? (
            <>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 h-8 text-sm border-border/50 shadow-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
              />
              <Button
                size="sm"
                className="h-7 text-xs rounded-lg"
                onClick={handleSaveEdit}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs rounded-lg text-muted-foreground"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <span
                className={`flex-1 text-sm ${project.archived ? "text-muted-foreground line-through" : ""}`}
              >
                {project.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground/50 hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  setEditingId(project._id);
                  setEditName(project.name);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              {project.archived ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded text-muted-foreground/50 hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    void unarchiveProject({ id: project._id });
                  }}
                >
                  <ArchiveRestore className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded text-muted-foreground/50 hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    void archiveProject({ id: project._id });
                  }}
                >
                  <Archive className="h-3 w-3" />
                </Button>
              )}
            </>
          )}
        </div>
      ))}
      <Separator className="my-1" />
      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New project name"
          className="flex-1 h-8 text-sm border-border/50 shadow-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <Button
          size="sm"
          className="h-8 text-xs rounded-lg gap-1"
          onClick={handleCreate}
          disabled={!newName.trim()}
        >
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>
    </div>
  );
}

function PresetsTab({
  currentFilters,
  currentSortKeys,
}: {
  currentFilters: Filters;
  currentSortKeys: SortKey[];
}) {
  const presets = useQuery(api.filterPresets.list) ?? [];
  const createPreset = useMutation(api.filterPresets.create);
  const updatePreset = useMutation(api.filterPresets.update);
  const removePreset = useMutation(api.filterPresets.remove);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<Id<"filterPresets"> | null>(null);
  const [editName, setEditName] = useState("");

  const hasActiveConfig =
    Object.values(currentFilters).some(
      (v) => Array.isArray(v) && v.length > 0,
    ) || currentSortKeys.length > 0;

  const handleCreate = () => {
    if (!newName.trim()) return;
    void createPreset({
      name: newName.trim(),
      filters: JSON.stringify(currentFilters),
      sortKeys: JSON.stringify(currentSortKeys),
    }).then(() => setNewName(""));
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    void updatePreset({ id: editingId, name: editName.trim() }).then(() => {
      setEditingId(null);
    });
  };

  const handleUpdateConfig = (id: Id<"filterPresets">) => {
    void updatePreset({
      id,
      filters: JSON.stringify(currentFilters),
      sortKeys: JSON.stringify(currentSortKeys),
    });
  };

  return (
    <div className="flex flex-col gap-2 py-3">
      <p className="text-xs text-muted-foreground">
        Save your current filter and sort configuration as a preset for quick
        access.
      </p>
      {presets.length === 0 && (
        <p className="text-xs text-muted-foreground/60 py-4 text-center">
          No presets yet. Set up filters/sort, then save them here.
        </p>
      )}
      {presets.map((preset) => (
        <div key={preset._id} className="flex items-center gap-2 group">
          {editingId === preset._id ? (
            <>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 h-8 text-sm border-border/50 shadow-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
              />
              <Button
                size="sm"
                className="h-7 text-xs rounded-lg"
                onClick={handleSaveEdit}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs rounded-lg text-muted-foreground"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm">{preset.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 rounded text-muted-foreground/50 hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => handleUpdateConfig(preset._id)}
                title="Overwrite this preset with current filters & sort"
              >
                Overwrite
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground/50 hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  setEditingId(preset._id);
                  setEditName(preset.name);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground/50 hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  void removePreset({ id: preset._id });
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ))}
      <Separator className="my-1" />
      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Preset name"
          className="flex-1 h-8 text-sm border-border/50 shadow-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <Button
          size="sm"
          className="h-8 text-xs rounded-lg gap-1"
          onClick={handleCreate}
          disabled={!newName.trim()}
          title={
            hasActiveConfig
              ? "Save current filters & sort as a preset"
              : "Set filters or sort keys first, then save"
          }
        >
          <Plus className="h-3 w-3" />
          Save
        </Button>
      </div>
      {!hasActiveConfig && newName.trim() && (
        <p className="text-[10px] text-muted-foreground/60">
          Tip: Set up filters and/or sort keys first, then save them as a
          preset.
        </p>
      )}
    </div>
  );
}
