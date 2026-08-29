"use client";

import type { ReactNode } from "react";
import { LinkifiedText } from "@/components/LinkifiedText";
import { Badge } from "@/components/ui/badge";
import { History, Plus, Pencil, Trash2, Archive, ArchiveRestore, ArrowUpDown, UserPlus, MessageSquarePlus, MessageSquareX, Search, Upload } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export const AUDIT_GRID_COLS = "minmax(0, 1.8fr) 120px 100px 150px 120px";

export const ENTITY_TYPES = [
  { value: "all", label: "All" },
  { value: "task", label: "Tasks" },
  { value: "project", label: "Projects" },
  { value: "device", label: "Devices" },
  { value: "credential", label: "Credentials" },
  { value: "taskState", label: "States" },
  { value: "priority", label: "Priorities" },
  { value: "tag", label: "Tags" },
  { value: "user", label: "Users" },
];

export const ENTITY_LABELS: Record<string, string> = {
  task: "Task",
  project: "Project",
  device: "Device",
  credential: "Credential",
  taskState: "State",
  priority: "Priority",
  tag: "Tag",
  user: "User",
};

export type AuditLogItem = {
  _id: Id<"auditLogs">;
  action: string;
  entityType: string;
  entityId: string;
  changes?: string;
  metadata?: string;
  timestamp: number;
  user: {
    _id: Id<"users">;
    name?: string | null;
    email?: string | null;
  } | null;
};

export const ACTION_CONFIG: Record<
  string,
  { icon: ReactNode; label: string; color: string }
> = {
  create: {
    icon: <Plus className="h-3 w-3" />,
    label: "Created",
    color: "hsl(142, 71%, 45%)",
  },
  update: {
    icon: <Pencil className="h-3 w-3" />,
    label: "Updated",
    color: "hsl(38, 92%, 50%)",
  },
  delete: {
    icon: <Trash2 className="h-3 w-3" />,
    label: "Deleted",
    color: "hsl(0, 84%, 60%)",
  },
  archive: {
    icon: <Archive className="h-3 w-3" />,
    label: "Archived",
    color: "hsl(240, 5%, 64%)",
  },
  unarchive: {
    icon: <ArchiveRestore className="h-3 w-3" />,
    label: "Unarchived",
    color: "hsl(280, 60%, 60%)",
  },
  reorder: {
    icon: <ArrowUpDown className="h-3 w-3" />,
    label: "Reordered",
    color: "hsl(200, 70%, 55%)",
  },
  signup: {
    icon: <UserPlus className="h-3 w-3" />,
    label: "Signed up",
    color: "hsl(160, 60%, 45%)",
  },
  add_update: {
    icon: <MessageSquarePlus className="h-3 w-3" />,
    label: "Posted update",
    color: "hsl(210, 80%, 60%)",
  },
  remove_update: {
    icon: <MessageSquareX className="h-3 w-3" />,
    label: "Deleted update",
    color: "hsl(0, 70%, 60%)",
  },
  upload: {
    icon: <Upload className="h-3 w-3" />,
    label: "Uploaded",
    color: "hsl(210, 80%, 60%)",
  },
};

export function formatRelative(ts: number) {
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
}

export function parseAuditMetadata(metadata?: string) {
  if (!metadata) return {} as Record<string, unknown>;

  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function parseAuditChanges(changesJson?: string) {
  if (!changesJson) return null;

  try {
    return JSON.parse(changesJson) as Record<string, { old: unknown; new: unknown }>;
  } catch {
    return null;
  }
}

function stringifyAuditValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function matchesSearch(log: AuditLogItem, query: string) {
  if (query.length === 0) return true;

  const config = ACTION_CONFIG[log.action] ?? {
    icon: <Pencil className="h-3 w-3" />,
    label: log.action,
    color: "hsl(0, 0%, 60%)",
  };
  const entityLabel = ENTITY_LABELS[log.entityType] ?? log.entityType;
  const metadata = parseAuditMetadata(log.metadata);
  const changes = parseAuditChanges(log.changes);
  const changeText =
    changes === null
      ? ""
      : Object.entries(changes)
          .map(([field, values]) => `${field} ${stringifyAuditValue(values.old)} ${stringifyAuditValue(values.new)}`)
          .join(" ");

  const haystack = [
    config.label,
    entityLabel,
    log.entityType,
    log.entityId,
    log.user?.name,
    log.user?.email,
    typeof metadata.name === "string" ? metadata.name : "",
    typeof metadata.body === "string" ? metadata.body : "",
    changeText,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function ChangesDisplay({ changesJson }: { changesJson: string }) {
  const changes = parseAuditChanges(changesJson);
  if (changes === null) return null;

  return (
    <div className="mt-2 space-y-1">
      {Object.entries(changes).map(([field, { old: oldVal, new: newVal }]) => (
        <div
          key={field}
          className="text-[11px] leading-relaxed flex flex-col sm:flex-row items-start gap-1.5"
        >
          <span className="font-medium text-muted-foreground capitalize shrink-0">
            {field}:
          </span>
          <div className="flex-1 min-w-0 sm:flex sm:items-center sm:gap-2">
            <span className="text-red-400/80 line-through break-words sm:truncate sm:max-w-[180px]">
              {stringifyAuditValue(oldVal)}
            </span>
            <span className="text-muted-foreground shrink-0">→</span>
            <span className="text-green-500/80 break-words sm:truncate sm:max-w-[180px]">
              {stringifyAuditValue(newVal)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuditHistoryList({
  logs,
  searchQuery = "",
}: {
  logs: readonly AuditLogItem[];
  searchQuery?: string;
}) {
  const normalizedQuery = searchQuery.toLowerCase().trim();
  const filteredLogs = logs.filter((log) => matchesSearch(log, normalizedQuery));

  if (filteredLogs.length === 0) {
    if (normalizedQuery.length > 0) {
      return (
        <div className="p-12 text-center">
          <Search className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No audit entries matching &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      );
    }

    return (
      <div className="py-16 text-center border border-dashed border-primary/30 rounded-lg w-full bg-primary/5">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <History className="h-5 w-5 text-primary/60" />
        </div>
        <p className="text-sm text-muted-foreground">No audit entries yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Changes will appear here as you interact with the system
        </p>
      </div>
    );
  }

  return (
    <div>
      {filteredLogs.map((log, index) => {
        const config = ACTION_CONFIG[log.action] ?? {
          icon: <Pencil className="h-3 w-3" />,
          label: log.action,
          color: "hsl(0, 0%, 60%)",
        };
        const entityLabel = ENTITY_LABELS[log.entityType] ?? log.entityType;
        const metadata = parseAuditMetadata(log.metadata);
        const displayName =
          typeof metadata.name === "string" && metadata.name.length > 0
            ? metadata.name
            : `${entityLabel} activity`;
        const userLabel = log.user?.name ?? log.user?.email ?? "System";

        return (
          <div key={log._id}>
            <div
              className="md:hidden border-b border-border/50 transition-colors hover:bg-muted/50 animate-fade-in p-3"
              style={{ animationDelay: `${Math.min(index, 20) * 25}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: config.color + "18",
                        color: config.color,
                      }}
                    >
                      {config.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{displayName}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <Badge
                          variant="outline"
                          className="h-5 text-[10px] px-1.5 rounded-md font-normal"
                          style={{
                            borderColor: config.color + "40",
                            color: config.color,
                          }}
                        >
                          {config.label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="h-5 text-[10px] px-1.5 rounded-md font-normal text-muted-foreground"
                        >
                          {entityLabel}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {userLabel}
                        </span>
                      </div>
                      {typeof metadata.body === "string" && metadata.body && (
                        <div className="mt-1.5 p-2 bg-muted/50 rounded-md border border-border/30 text-xs text-muted-foreground italic break-words line-clamp-2">
                          &quot;<LinkifiedText>{metadata.body}</LinkifiedText>&quot;
                        </div>
                      )}
                      {log.changes && <ChangesDisplay changesJson={log.changes} />}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground/50 shrink-0 mt-1">
                  {formatRelative(log.timestamp)}
                </span>
              </div>
            </div>

            <div
              className="hidden md:grid items-start py-2.5 border-b border-border/50 transition-colors hover:bg-muted/50 animate-fade-in gap-3"
              style={{
                gridTemplateColumns: AUDIT_GRID_COLS,
                animationDelay: `${Math.min(index, 20) * 25}ms`,
              }}
            >
              <div className="flex items-start gap-3 min-w-0 pr-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    backgroundColor: config.color + "18",
                    color: config.color,
                  }}
                >
                  {config.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{displayName}</p>
                  {typeof metadata.body === "string" && metadata.body && (
                    <div className="mt-1 p-2 bg-muted/50 rounded-md border border-border/30 text-xs text-muted-foreground italic break-words line-clamp-2">
                      &quot;<LinkifiedText>{metadata.body}</LinkifiedText>&quot;
                    </div>
                  )}
                  {log.changes && <ChangesDisplay changesJson={log.changes} />}
                </div>
              </div>
              <div className="pt-0.5">
                <Badge
                  variant="outline"
                  className="h-5 text-[10px] px-1.5 rounded-md font-normal"
                  style={{
                    borderColor: config.color + "40",
                    color: config.color,
                  }}
                >
                  {config.label}
                </Badge>
              </div>
              <div className="pt-0.5">
                <Badge
                  variant="outline"
                  className="h-5 text-[10px] px-1.5 rounded-md font-normal text-muted-foreground"
                >
                  {entityLabel}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground pt-1 truncate pr-2" title={userLabel}>
                {userLabel}
              </div>
              <div className="text-xs text-muted-foreground tabular-nums pt-1">
                {formatRelative(log.timestamp)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}