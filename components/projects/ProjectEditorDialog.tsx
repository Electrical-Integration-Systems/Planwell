"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type ProjectFormState = {
  name: string;
  description: string;
  location: string;
};

export const EMPTY_PROJECT_FORM: ProjectFormState = {
  name: "",
  description: "",
  location: "",
};

export function ProjectEditorDialog({
  open,
  onOpenChange,
  title,
  values,
  onValuesChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  values: ProjectFormState;
  onValuesChange: (values: ProjectFormState) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] border-border/60 shadow-warm-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl tracking-tight">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={values.name}
            onChange={(e) => onValuesChange({ ...values, name: e.target.value })}
            placeholder="Project name"
            className="h-10 border-border/50 shadow-none"
          />
          <Input
            value={values.location}
            onChange={(e) => onValuesChange({ ...values, location: e.target.value })}
            placeholder="Project location"
            className="h-10 border-border/50 shadow-none"
          />
          <Textarea
            value={values.description}
            onChange={(e) =>
              onValuesChange({ ...values, description: e.target.value })
            }
            placeholder="Project description"
            className="min-h-28 border-border/50 shadow-none"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              className="rounded-lg"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-lg"
              onClick={onSubmit}
              disabled={!values.name.trim()}
            >
              Save project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}