"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Server, Trash2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Device = {
  _id: Id<"projectDevices">;
  name: string;
  description?: string;
  ipAddress?: string;
  deviceType?: string;
  location?: string;
  notes?: string;
  updatedAt: number;
};

type Draft = {
  name: string;
  ipAddress: string;
  deviceType: string;
  location: string;
  description: string;
  notes: string;
};

type Callbacks = {
  onCreate: (args: {
    projectId: Id<"projects">;
    name: string;
    ipAddress?: string;
    deviceType?: string;
    location?: string;
    description?: string;
    notes?: string;
  }) => Promise<unknown>;
  onUpdate: (args: {
    id: Id<"projectDevices">;
    name?: string;
    ipAddress?: string;
    deviceType?: string;
    location?: string;
    description?: string;
    notes?: string;
  }) => Promise<unknown>;
  onDelete: (args: { id: Id<"projectDevices"> }) => Promise<unknown>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const NEW_ROW = "__new__";

const EMPTY: Draft = {
  name: "",
  ipAddress: "",
  deviceType: "",
  location: "",
  description: "",
  notes: "",
};

// grid: Name | IP | Type | Location | Description | Notes | [del]
const GRID = "minmax(160px,2fr) 130px 110px 130px minmax(140px,1.5fr) minmax(140px,1.5fr) 36px";

const HEADERS = ["Device name", "IP address", "Type", "Location", "Description", "Notes", ""];

const FIELDS: { key: keyof Draft; placeholder: string }[] = [
  { key: "name", placeholder: "Device name" },
  { key: "ipAddress", placeholder: "192.168.x.x" },
  { key: "deviceType", placeholder: "PLC, Switch…" },
  { key: "location", placeholder: "Panel A, Room 2…" },
  { key: "description", placeholder: "Description" },
  { key: "notes", placeholder: "Notes" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDraft(d: Device): Draft {
  return {
    name: d.name,
    ipAddress: d.ipAddress ?? "",
    deviceType: d.deviceType ?? "",
    location: d.location ?? "",
    description: d.description ?? "",
    notes: d.notes ?? "",
  };
}

function toPayload(draft: Draft) {
  const opt = (s: string) => s.trim() || undefined;
  return {
    name: draft.name.trim(),
    ipAddress: opt(draft.ipAddress),
    deviceType: opt(draft.deviceType),
    location: opt(draft.location),
    description: opt(draft.description),
    notes: opt(draft.notes),
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DeviceSpreadsheet({
  projectId,
  devices,
  onCreate,
  onUpdate,
  onDelete,
}: { projectId: Id<"projects">; devices: Device[] } & Callbacks) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"projectDevices"> | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Keep latest state in a ref to avoid stale closures in async callbacks
  const latestRef = useRef({ editingId, draft });
  latestRef.current = { editingId, draft };

  const filtered = devices.filter((d) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return [d.name, d.description, d.ipAddress, d.deviceType, d.location, d.notes]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  // ── Commit current draft to the backend ──
  const commit = async (): Promise<boolean> => {
    const { editingId: id, draft: d } = latestRef.current;
    if (!d.name.trim()) {
      // Discard empty new row; for existing rows revert silently
      setEditingId(null);
      setDraft(EMPTY);
      return true;
    }
    try {
      if (id === NEW_ROW) {
        await onCreate({ projectId, ...toPayload(d) });
      } else if (id) {
        await onUpdate({ id: id as Id<"projectDevices">, ...toPayload(d) });
      }
      setEditingId(null);
      setDraft(EMPTY);
      return true;
    } catch {
      toast.error("Failed to save device");
      return false;
    }
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(EMPTY);
  };

  // Save when focus leaves the editing row entirely
  const handleRowBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    void commit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); void commit(); }
    if (e.key === "Escape") { e.preventDefault(); cancel(); }
  };

  const activateRow = (device: Device) => {
    if (editingId === device._id) return;
    // If a different row is being edited, the blur handler will save it first
    setEditingId(device._id);
    setDraft(toDraft(device));
  };

  const addRow = async () => {
    if (editingId !== null) {
      const ok = await commit();
      if (!ok) return;
    }
    setEditingId(NEW_ROW);
    setDraft(EMPTY);
    // Focus the first input after React renders the new row
    setTimeout(() => firstInputRef.current?.focus(), 30);
  };

  return (
    <div className="space-y-3 pt-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {devices.length > 0 && (
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search devices…"
              className="h-8 text-xs pl-8 border-border/50 bg-transparent shadow-none rounded-lg"
            />
          </div>
        )}
        <Button size="sm" className="h-8 text-xs gap-1.5 rounded-lg px-3" onClick={addRow}>
          <Plus className="h-3.5 w-3.5" />
          Add device
        </Button>
      </div>

      {devices === undefined ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="overflow-x-auto -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8">
          <div style={{ minWidth: 900 }}>
            {/* Header */}
            {(filtered.length > 0 || editingId === NEW_ROW) && (
              <div
                className="grid items-center py-2 border-b border-border/40 gap-x-2"
                style={{ gridTemplateColumns: GRID }}
              >
                {HEADERS.map((h, i) => (
                  <div key={i} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1.5">
                    {h}
                  </div>
                ))}
              </div>
            )}

            {/* Existing rows */}
            {filtered.map((device) => {
              const isEditing = editingId === device._id;
              return isEditing ? (
                <EditingRow
                  key={device._id}
                  draft={draft}
                  onDraftChange={setDraft}
                  onBlur={handleRowBlur}
                  onKeyDown={handleKeyDown}
                  firstInputRef={null}
                />
              ) : (
                <ReadOnlyRow
                  key={device._id}
                  device={device}
                  onActivate={() => activateRow(device)}
                  onDelete={() => setPendingDeleteId(device._id)}
                />
              );
            })}

            {/* New row */}
            {editingId === NEW_ROW && (
              <EditingRow
                draft={draft}
                onDraftChange={setDraft}
                onBlur={handleRowBlur}
                onKeyDown={handleKeyDown}
                firstInputRef={firstInputRef}
              />
            )}

            {/* Empty state */}
            {filtered.length === 0 && editingId !== NEW_ROW && (
              <div className="py-14 text-center border border-dashed border-primary/30 rounded-lg bg-primary/5 mt-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Server className="h-5 w-5 text-primary/60" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {search.trim() ? "No matching devices" : "No devices yet"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Click &ldquo;Add device&rdquo; to start tracking project equipment
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmActionDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete device?"
        description="This device will be permanently removed from the project."
        confirmLabel="Delete device"
        onConfirm={() =>
          pendingDeleteId
            ? onDelete({ id: pendingDeleteId }).then(() => setPendingDeleteId(null))
            : Promise.resolve()
        }
      />
    </div>
  );
}

// ─── Read-only row ────────────────────────────────────────────────────────────

function ReadOnlyRow({
  device,
  onActivate,
  onDelete,
}: {
  device: Device;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const cells = [
    device.name,
    device.ipAddress ?? "",
    device.deviceType ?? "",
    device.location ?? "",
    device.description ?? "",
    device.notes ?? "",
  ];

  return (
    <div
      className="grid items-center gap-x-2 border-b border-border/30 group hover:bg-muted/40 transition-colors cursor-pointer"
      style={{ gridTemplateColumns: GRID }}
      onClick={onActivate}
    >
      {cells.map((val, i) => (
        <div
          key={i}
          className="py-2 px-1.5 text-xs truncate"
          title={val || undefined}
        >
          {i === 0 ? (
            <span className="font-medium">{val}</span>
          ) : (
            <span className="text-muted-foreground">{val || "—"}</span>
          )}
        </div>
      ))}
      <div className="flex justify-end pr-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Editing row ──────────────────────────────────────────────────────────────

function EditingRow({
  draft,
  onDraftChange,
  onBlur,
  onKeyDown,
  firstInputRef,
}: {
  draft: Draft;
  onDraftChange: (d: Draft) => void;
  onBlur: (e: React.FocusEvent<HTMLDivElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  firstInputRef: React.RefObject<HTMLInputElement | null> | null;
}) {
  return (
    <div
      className="grid items-center gap-x-2 border-b border-primary/30 bg-primary/[0.04] ring-1 ring-primary/20 ring-inset"
      style={{ gridTemplateColumns: GRID }}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      {FIELDS.map((f, i) => (
        <div key={f.key} className="py-1.5 px-1">
          <Input
            ref={i === 0 ? firstInputRef : undefined}
            value={draft[f.key]}
            onChange={(e) => onDraftChange({ ...draft, [f.key]: e.target.value })}
            placeholder={f.placeholder}
            className="h-7 text-xs border-border/50 shadow-none rounded-md focus-visible:ring-1 focus-visible:ring-primary/40"
          />
        </div>
      ))}
      {/* Empty last cell to align with delete column */}
      <div />
    </div>
  );
}
