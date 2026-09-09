"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDateTime(timestamp: number | undefined) {
  if (timestamp === undefined) return "—";
  return new Date(timestamp).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CredentialSharedLinks({
  projectId,
}: {
  projectId: Id<"projects">;
}) {
  const shares = useQuery(api.credentialShares.listByProject, { projectId });
  const removeShare = useMutation(api.credentialShares.remove);
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"credentialShares"> | null>(null);

  if (shares === undefined) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading shared links...</p>;
  }

  if (shares.length === 0) {
    return (
      <div className="border border-dashed border-border/60 py-14 text-center">
        <Link2 className="mx-auto h-7 w-7 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">No shared links for this project.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mode</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Entries</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Last accessed</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shares.map((share) => (
            <TableRow key={share._id}>
              <TableCell>{share.mode === "one_time" ? "One-time" : "Timed"}</TableCell>
              <TableCell>
                <Badge variant={share.status === "active" ? "default" : "outline"}>
                  {share.status}
                </Badge>
              </TableCell>
              <TableCell>{share.credentialCount}</TableCell>
              <TableCell>{formatDateTime(share.createdAt)}</TableCell>
              <TableCell>{formatDateTime(share.expiresAt)}</TableCell>
              <TableCell>{formatDateTime(share.lastAccessedAt)}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setPendingDeleteId(share._id)}
                  aria-label={`Delete ${share.status} shared link`}
                  title="Delete shared link"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmActionDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete shared link?"
        description="This permanently deletes the link record. An active link will stop working immediately."
        confirmLabel="Delete link"
        onConfirm={() =>
          pendingDeleteId
            ? removeShare({ id: pendingDeleteId })
                .then(() => toast.success("Shared link deleted"))
                .catch(() => toast.error("Failed to delete shared link"))
            : Promise.resolve()
        }
      />
    </>
  );
}