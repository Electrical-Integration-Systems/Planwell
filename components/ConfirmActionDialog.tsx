"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  tone = "destructive",
  requiredText,
  requiredTextLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
  tone?: "default" | "destructive";
  requiredText?: string;
  requiredTextLabel?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [confirmationValue, setConfirmationValue] = useState("");

  const isConfirmationMatched =
    requiredText === undefined || confirmationValue === requiredText;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setConfirmationValue("");
      setSubmitting(false);
    }
    onOpenChange(nextOpen);
  }

  function handleConfirm() {
    if (!isConfirmationMatched) return;

    setSubmitting(true);
    Promise.resolve(onConfirm())
      .then(() => onOpenChange(false))
      .finally(() => setSubmitting(false));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] border-border/60 shadow-warm-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {requiredText !== undefined && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {requiredTextLabel ?? "Type the confirmation text to continue."}
            </p>
            <div
              className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 select-none"
              onCopy={(event) => event.preventDefault()}
              onCut={(event) => event.preventDefault()}
              onContextMenu={(event) => event.preventDefault()}
            >
              <p className="text-xs font-mono break-words">{requiredText}</p>
            </div>
            <Input
              value={confirmationValue}
              onChange={(e) => setConfirmationValue(e.target.value)}
              placeholder={requiredText}
              className="h-10 border-border/50 shadow-none"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>
        )}
        <DialogFooter>
          <Button
            variant="ghost"
            className="rounded-lg"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant={tone}
            className="rounded-lg"
            onClick={handleConfirm}
            disabled={submitting || !isConfirmationMatched}
          >
            {submitting ? "Working..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}