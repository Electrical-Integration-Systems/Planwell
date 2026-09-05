"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { Clock3, Copy, Link2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SelectedCredential = {
  id: Id<"projectCredentials">;
  name: string;
};

type GeneratedShare = {
  token: string;
  pin: string;
  expiresAt?: number;
};

function copyText(value: string, message: string) {
  if (!navigator.clipboard) {
    toast.error("Clipboard access is unavailable");
    return;
  }

  void navigator.clipboard
    .writeText(value)
    .then(() => toast.success(message))
    .catch(() => toast.error("Failed to copy"));
}

export function CredentialShareDialog({
  projectId,
  selectedCredentials,
  open,
  onOpenChange,
  onCreated,
}: {
  projectId: Id<"projects">;
  selectedCredentials: SelectedCredential[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const createShare = useAction(api.credentialShareActions.createShare);
  const [mode, setMode] = useState<"timed" | "one_time">("one_time");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [isCreating, setIsCreating] = useState(false);
  const [generatedShare, setGeneratedShare] = useState<GeneratedShare | null>(null);

  const shareUrl = generatedShare
    ? `${window.location.origin}/share#${generatedShare.token}`
    : "";

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setGeneratedShare(null);
      setIsCreating(false);
    }
    onOpenChange(nextOpen);
  };

  const handleCreate = () => {
    if (selectedCredentials.length === 0) return;

    setIsCreating(true);
    void createShare({
      projectId,
      credentialIds: selectedCredentials.map((credential) => credential.id),
      mode,
      durationMinutes: mode === "timed" ? Number(durationMinutes) : undefined,
    })
      .then((result) => {
        setGeneratedShare({
          token: result.token,
          pin: result.pin,
          expiresAt: result.expiresAt,
        });
        onCreated();
        toast.success("Share link created");
      })
      .catch(() => toast.error("Failed to create share link"))
      .finally(() => setIsCreating(false));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto border-border/60 sm:max-w-[660px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl tracking-tight">
              Share credentials
            </DialogTitle>
            <DialogDescription>
              PIN-protect a snapshot of only the selected entries.
            </DialogDescription>
          </DialogHeader>

          {generatedShare ? (
            <div className="space-y-5">
              <div className="border-y border-border/50 py-4">
                <div className="mb-4 flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Link created</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Send the link and PIN through separate channels. The PIN cannot be recovered later.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Share link</Label>
                    <div className="mt-1 flex min-w-0 items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                        {shareUrl}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => copyText(shareUrl, "Share link copied")}
                        aria-label="Copy share link"
                        title="Copy share link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">PIN</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 rounded-md border border-border/60 bg-muted/40 px-3 py-2 font-mono text-base tracking-[0.2em]">
                        {generatedShare.pin}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => copyText(generatedShare.pin, "PIN copied")}
                        aria-label="Copy PIN"
                        title="Copy PIN"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="mt-4 w-full gap-1.5"
                  onClick={() =>
                    copyText(
                      `LINK: ${shareUrl}\nPIN: ${generatedShare.pin}`,
                      "Share link and PIN copied",
                    )
                  }
                >
                  <Copy className="h-4 w-4" />
                  Copy link and PIN
                </Button>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleOpenChange(false)}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Selected entries ({selectedCredentials.length})
                </p>
                {selectedCredentials.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Select credential entries in the list to create a new link.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedCredentials.map((credential) => (
                      <Badge key={credential.id} variant="secondary">
                        {credential.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="share-mode">Access mode</Label>
                  <Select
                    value={mode}
                    onValueChange={(value) => setMode(value as "timed" | "one_time")}
                  >
                    <SelectTrigger id="share-mode" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-time use</SelectItem>
                      <SelectItem value="timed">Time limited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {mode === "timed" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="share-duration">Duration</Label>
                    <Select value={durationMinutes} onValueChange={setDurationMinutes}>
                      <SelectTrigger id="share-duration" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                        <SelectItem value="720">12 hours</SelectItem>
                        <SelectItem value="1440">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="flex items-start gap-2 border-l-2 border-primary/50 pl-3 text-xs text-muted-foreground">
                {mode === "one_time" ? (
                  <>
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      The first correct PIN permanently consumes this link. Access also ends when the recipient leaves the tab. Viewed or copied information cannot be recalled.
                    </p>
                  </>
                ) : (
                  <>
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>The link can be opened repeatedly with the PIN until it expires.</p>
                  </>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  className="gap-1.5"
                  disabled={selectedCredentials.length === 0 || isCreating}
                  onClick={handleCreate}
                >
                  <Link2 className="h-4 w-4" />
                  {isCreating ? "Creating..." : "Create share link"}
                </Button>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
  );
}