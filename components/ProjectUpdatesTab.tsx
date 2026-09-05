"use client";

import { useRef, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ACTION_CONFIG, formatRelative, parseAuditMetadata } from "@/components/AuditHistoryList";
import { LinkifiedText } from "@/components/LinkifiedText";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import {
  FileUp,
  FolderKanban,
  KeyRound,
  MessageSquare,
  Pencil,
  Send,
  Server,
  Trash2,
} from "lucide-react";

// ─── Activity text formatter ────────────────────────────────────────────────

function formatActivityText(log: {
  action: string;
  entityType: string;
  metadata?: string;
}): string {
  const meta = parseAuditMetadata(log.metadata);
  const name = (meta.name as string) ?? "";

  switch (`${log.entityType}:${log.action}`) {
    case "project:create":
      return "created this project";
    case "project:update":
      return "updated project details";
    case "project:archive": {
      const count = meta.archivedTaskCount as number | undefined;
      return count != null
        ? `archived this project (${count} task${count === 1 ? "" : "s"} archived)`
        : "archived this project";
    }
    case "project:unarchive":
      return "unarchived this project";

    case "task:create":
      return `created task "${name}"`;
    case "task:update":
      return `updated task "${name}"`;
    case "task:archive":
      return `archived task "${name}"`;
    case "task:unarchive":
      return `unarchived task "${name}"`;
    case "task:delete":
      return `deleted task "${name}"`;
    case "task:add_update":
      return `commented on task "${name}"`;
    case "task:remove_update":
      return `removed a comment from task "${name}"`;

    case "file:upload": {
      const kind = meta.kind as string | undefined;
      const taskTitle = meta.taskTitle as string | undefined;
      const label = kind === "photo" ? "photo" : "file";
      return taskTitle
        ? `uploaded ${label} "${name}" on task "${taskTitle}"`
        : `uploaded ${label} "${name}"`;
    }
    case "file:delete": {
      const kind = meta.kind as string | undefined;
      return `deleted ${kind === "photo" ? "photo" : "file"} "${name}"`;
    }

    case "device:create":
      return `added device "${name}"`;
    case "device:update":
      return `updated device "${name}"`;
    case "device:delete":
      return `deleted device "${name}"`;

    case "credential:create":
      return `added credential "${name}"`;
    case "credential:update":
      return `updated credential "${name}"`;
    case "credential:delete":
      return `deleted credential "${name}"`;
    case "credentialShare:create":
      return "created a credential share link";
    case "credentialShare:access":
      return "credential share link opened by a recipient";
    case "credentialShare:pin_failed":
      return "credential share PIN rejected";
    case "credentialShare:redeem":
      return "credential share PIN accepted";
    case "credentialShare:revoke":
      return "revoked a credential share link";
    case "credentialShare:delete":
      return "deleted a credential share link";

    default:
      return `${log.action} ${log.entityType}`;
  }
}

function entityIcon(entityType: string) {
  switch (entityType) {
    case "task":
      return <FolderKanban className="h-3 w-3" />;
    case "file":
      return <FileUp className="h-3 w-3" />;
    case "device":
      return <Server className="h-3 w-3" />;
    case "credential":
    case "credentialShare":
      return <KeyRound className="h-3 w-3" />;
    default:
      return <Pencil className="h-3 w-3" />;
  }
}

// ─── Avatar helper ───────────────────────────────────────────────────────────

function UserAvatar({
  user,
  size = "sm",
}: {
  user: { name?: string | null; email?: string | null } | null;
  size?: "sm" | "md";
}) {
  const initial = (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase();
  const cls =
    size === "md"
      ? "w-8 h-8 rounded-full bg-primary text-[11px] font-semibold text-primary-foreground flex items-center justify-center shrink-0"
      : "w-6 h-6 rounded-full bg-primary text-[9px] font-semibold text-primary-foreground flex items-center justify-center shrink-0";
  return <div className={cls}>{initial}</div>;
}

// ─── Feed item types ─────────────────────────────────────────────────────────

type CommentItem = {
  kind: "comment";
  _id: Id<"projectUpdates">;
  timestamp: number;
  userId: Id<"users">;
  body: string;
  user: { name?: string | null; email?: string | null } | null;
};

type ActivityItem = {
  kind: "activity";
  _id: Id<"auditLogs">;
  timestamp: number;
  action: string;
  entityType: string;
  metadata?: string;
  user: { name?: string | null; email?: string | null } | null;
};

type FeedItem = CommentItem | ActivityItem;

// ─── Main component ──────────────────────────────────────────────────────────

export function ProjectUpdatesTab({
  projectId,
}: {
  projectId: Id<"projects">;
}) {
  const projectUpdates = useQuery(api.projectUpdates.list, { projectId });
  const auditLogs = useQuery(api.auditLog.listForProject, { projectId });
  const viewer = useQuery(api.users.viewer);
  const createUpdate = useMutation(api.projectUpdates.create);
  const removeUpdate = useMutation(api.projectUpdates.remove);

  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Id<"projectUpdates"> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Build the merged feed
  const feed: FeedItem[] = [];
  for (const u of projectUpdates ?? []) {
    feed.push({
      kind: "comment",
      _id: u._id,
      timestamp: u.createdAt,
      userId: u.userId,
      body: u.body,
      user: u.user,
    });
  }
  for (const l of auditLogs ?? []) {
    feed.push({
      kind: "activity",
      _id: l._id,
      timestamp: l.timestamp,
      action: l.action,
      entityType: l.entityType,
      metadata: l.metadata,
      user: l.user,
    });
  }
  feed.sort((a, b) => a.timestamp - b.timestamp);

  // Scroll to bottom when a new comment is posted
  useEffect(() => {
    const count = feed.length;
    if (count > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCountRef.current = count;
  }, [feed.length]);

  const handleSubmit = () => {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    void createUpdate({ projectId, body: trimmed })
      .then(() => setBody(""))
      .finally(() => setSubmitting(false));
  };

  const isLoading = projectUpdates === undefined || auditLogs === undefined;

  return (
    <div className="flex flex-col gap-0 pt-2">
      {/* Feed */}
      <div className="flex flex-col gap-1 pb-4">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : feed.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-primary/30 rounded-lg bg-primary/5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="h-5 w-5 text-primary/60" />
            </div>
            <p className="text-sm text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Post an update or perform any action on this project to see it here
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border/40 pointer-events-none" />

            <div className="flex flex-col gap-3">
              {feed.map((item) =>
                item.kind === "comment" ? (
                  <CommentBubble
                    key={item._id}
                    item={item}
                    isOwn={viewer?._id === item.userId}
                    onDelete={() => setPendingDelete(item._id)}
                  />
                ) : (
                  <ActivityRow key={item._id} item={item} />
                ),
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="sticky bottom-0 bg-background pt-2 pb-1 border-t border-border/40">
        <div className="flex items-start gap-3">
          <UserAvatar user={viewer ?? null} size="md" />
          <div className="flex-1 flex flex-col gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
              placeholder="Leave an update…"
              className="min-h-[72px] resize-none text-sm border-border/50 shadow-none rounded-lg"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 rounded-lg px-3"
                onClick={handleSubmit}
                disabled={!body.trim() || submitting}
              >
                <Send className="h-3.5 w-3.5" />
                Post update
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmActionDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="Delete update?"
        description="This comment will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() =>
          pendingDelete
            ? removeUpdate({ id: pendingDelete }).then(() => setPendingDelete(null))
            : Promise.resolve()
        }
      />
    </div>
  );
}

// ─── Comment bubble ───────────────────────────────────────────────────────────

function CommentBubble({
  item,
  isOwn,
  onDelete,
}: {
  item: CommentItem;
  isOwn: boolean;
  onDelete: () => void;
}) {
  const displayName = item.user?.name ?? item.user?.email ?? "Unknown";

  return (
    <div className="flex items-start gap-3 pl-0 group animate-fade-in">
      <UserAvatar user={item.user} size="md" />
      <div className="flex-1 min-w-0">
        <div className="rounded-lg border border-border/50 bg-card shadow-warm-sm overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">{displayName}</span>
              <span className="text-[11px] text-muted-foreground">
                {formatRelative(item.timestamp)}
              </span>
            </div>
            {isOwn && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <p className="px-3 py-2.5 text-sm whitespace-pre-wrap break-words">
            <LinkifiedText>{item.body}</LinkifiedText>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Activity row ─────────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
  const config = ACTION_CONFIG[item.action] ?? {
    icon: entityIcon(item.entityType),
    label: item.action,
    color: "hsl(0, 0%, 60%)",
  };

  const displayName = item.user?.name ?? item.user?.email ?? "Unknown";
  const text = formatActivityText(item);

  return (
    <div className="flex items-center gap-3 pl-0 animate-fade-in">
      {/* Icon dot aligned with the timeline line */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-background"
        style={{ backgroundColor: config.color + "20", color: config.color }}
      >
        {config.icon}
      </div>
      <div className="flex-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
        <span className="text-xs font-medium">{displayName}</span>
        <span className="text-xs text-muted-foreground">{text}</span>
        <span className="text-[11px] text-muted-foreground/60 ml-auto whitespace-nowrap">
          {formatRelative(item.timestamp)}
        </span>
      </div>
    </div>
  );
}
