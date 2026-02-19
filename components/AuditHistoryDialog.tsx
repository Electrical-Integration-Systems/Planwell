"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Pencil,
    Trash2,
    Archive,
    ArchiveRestore,
    ArrowUpDown,
    UserPlus,
    History,
    MessageSquarePlus,
    MessageSquareX,
} from "lucide-react";

const ENTITY_TYPES = [
    { value: "all", label: "All" },
    { value: "task", label: "Tasks" },
    { value: "project", label: "Projects" },
    { value: "taskState", label: "States" },
    { value: "priority", label: "Priorities" },
    { value: "tag", label: "Tags" },
    { value: "user", label: "Users" },
];

const ACTION_CONFIG: Record<
    string,
    { icon: React.ReactNode; label: string; color: string }
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
};

const ENTITY_LABELS: Record<string, string> = {
    task: "Task",
    project: "Project",
    taskState: "State",
    priority: "Priority",
    tag: "Tag",
    user: "User",
};

function formatRelative(ts: number) {
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

function ChangesDisplay({ changesJson }: { changesJson: string }) {
    let changes: Record<string, { old: unknown; new: unknown }>;
    try {
        changes = JSON.parse(changesJson);
    } catch {
        return null;
    }

    return (
        <div className="mt-2 space-y-1">
            {Object.entries(changes).map(([field, { old: oldVal, new: newVal }]) => (
                <div
                    key={field}
                    className="text-[11px] leading-relaxed flex items-start gap-1.5"
                >
                    <span className="font-medium text-muted-foreground capitalize shrink-0">
                        {field}:
                    </span>
                    <span className="text-red-400/80 line-through truncate max-w-[180px]">
                        {Array.isArray(oldVal) ? oldVal.join(", ") : String(oldVal ?? "—")}
                    </span>
                    <span className="text-muted-foreground shrink-0">→</span>
                    <span className="text-green-500/80 truncate max-w-[180px]">
                        {Array.isArray(newVal) ? newVal.join(", ") : String(newVal ?? "—")}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function AuditHistoryDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [entityFilter, setEntityFilter] = useState("all");
    const logs =
        useQuery(
            api.auditLog.list,
            entityFilter === "all" ? {} : { entityType: entityFilter },
        ) ?? [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-[700px] h-[80vh] p-0 gap-0 flex flex-col overflow-hidden shadow-warm-lg border-border/60">
                <DialogHeader className="px-6 pt-5 pb-4 border-b border-primary/20 shrink-0 bg-primary/[0.03]">
                    <div className="h-1 -mx-6 -mt-5 mb-4 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
                    <div className="flex items-center justify-between">
                        <DialogTitle className="font-serif text-xl tracking-tight flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" />
                            Audit History
                        </DialogTitle>
                        <Select value={entityFilter} onValueChange={setEntityFilter}>
                            <SelectTrigger className="h-8 w-[140px] text-xs border-border/50 bg-transparent shadow-none rounded-lg">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ENTITY_TYPES.map((et) => (
                                    <SelectItem key={et.value} value={et.value}>
                                        {et.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                        Track all changes across the system
                    </p>
                </DialogHeader>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-4 flex flex-col gap-2">
                        {logs.length === 0 && (
                            <div className="py-16 text-center">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                                    <History className="h-6 w-6 text-primary/40" />
                                </div>
                                <p className="text-sm text-muted-foreground/60">
                                    No audit entries yet
                                </p>
                                <p className="text-xs text-muted-foreground/40 mt-1">
                                    Changes will appear here as you interact with the system
                                </p>
                            </div>
                        )}
                        {logs.map((log) => {
                            const config = ACTION_CONFIG[log.action] ?? {
                                icon: <Pencil className="h-3 w-3" />,
                                label: log.action,
                                color: "hsl(0, 0%, 60%)",
                            };
                            const entityLabel =
                                ENTITY_LABELS[log.entityType] ?? log.entityType;
                            let meta: Record<string, unknown> = {};
                            try {
                                if (log.metadata) meta = JSON.parse(log.metadata);
                            } catch {
                                /* ignore */
                            }

                            return (
                                <div
                                    key={log._id}
                                    className="bg-card rounded-lg p-3.5 border border-border/40 shadow-warm-sm animate-fade-in hover:border-border/60 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            {/* Action icon */}
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
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-[9px] font-medium text-primary-foreground shrink-0">
                                                        {(
                                                            log.user?.name ??
                                                            log.user?.email ??
                                                            "?"
                                                        )
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </span>
                                                    <span className="text-xs font-medium truncate">
                                                        {log.user?.name ?? log.user?.email ?? "System"}
                                                    </span>
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
                                                </div>
                                                {meta.name != null && (
                                                    <p className="text-sm mt-1 truncate text-foreground/80">
                                                        {String(meta.name)}
                                                    </p>
                                                )}
                                                {typeof meta.body === "string" && meta.body && (
                                                    <div className="mt-1.5 p-2 bg-muted/50 rounded-md border border-border/30 text-xs text-muted-foreground italic line-clamp-2">
                                                        &quot;{meta.body}&quot;
                                                    </div>
                                                )}
                                                {log.changes && (
                                                    <ChangesDisplay changesJson={log.changes} />
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground/50 shrink-0 mt-1">
                                            {formatRelative(log.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Reusable audit timeline for a specific task (used in TaskDetailDialog)
 */
export function TaskAuditTimeline({ taskId }: { taskId: string }) {
    const logs =
        useQuery(api.auditLog.listByEntity, {
            entityType: "task",
            entityId: taskId,
        }) ?? [];

    if (logs.length === 0) {
        return (
            <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <History className="h-6 w-6 text-primary/40" />
                </div>
                <p className="text-sm text-muted-foreground/60">
                    No audit entries for this task
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {logs.map((log) => {
                const config = ACTION_CONFIG[log.action] ?? {
                    icon: <Pencil className="h-3 w-3" />,
                    label: log.action,
                    color: "hsl(0, 0%, 60%)",
                };
                let meta: Record<string, unknown> = {};
                try {
                    if (log.metadata) meta = JSON.parse(log.metadata);
                } catch {
                    /* ignore */
                }

                return (
                    <div
                        key={log._id}
                        className="bg-card rounded-lg p-3 border border-border/40 shadow-warm-sm animate-fade-in"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                    style={{
                                        backgroundColor: config.color + "18",
                                        color: config.color,
                                    }}
                                >
                                    {config.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[8px] font-medium text-primary-foreground shrink-0">
                                            {(log.user?.name ?? log.user?.email ?? "?")
                                                .charAt(0)
                                                .toUpperCase()}
                                        </span>
                                        <span className="text-[11px] font-medium truncate">
                                            {log.user?.name ?? log.user?.email ?? "System"}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="h-4 text-[9px] px-1 rounded font-normal"
                                            style={{
                                                borderColor: config.color + "40",
                                                color: config.color,
                                            }}
                                        >
                                            {config.label}
                                        </Badge>
                                    </div>
                                    {typeof meta.body === "string" && meta.body && (
                                        <div className="mt-1.5 p-2 bg-muted/50 rounded-md border border-border/30 text-xs text-muted-foreground italic text-wrap break-words">
                                            &quot;{meta.body}&quot;
                                        </div>
                                    )}
                                    {log.changes && (
                                        <ChangesDisplay changesJson={log.changes} />
                                    )}
                                </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground/50 shrink-0">
                                {formatRelative(log.timestamp)}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
