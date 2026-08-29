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

export type CredentialFormState = {
  name: string;
  type: string;
  username: string;
  endpoint: string;
  secret: string;
  notes: string;
};

export const EMPTY_CREDENTIAL_FORM: CredentialFormState = {
  name: "",
  type: "",
  username: "",
  endpoint: "",
  secret: "",
  notes: "",
};

export function CredentialEditorDialog({
  open,
  onOpenChange,
  values,
  onValuesChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: CredentialFormState;
  onValuesChange: (values: CredentialFormState) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] border-border/60 shadow-warm-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl tracking-tight">
            Credential entry
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            value={values.name}
            onChange={(e) => onValuesChange({ ...values, name: e.target.value })}
            placeholder="Credential name"
            className="h-10 border-border/50 shadow-none"
          />
          <Input
            value={values.type}
            onChange={(e) => onValuesChange({ ...values, type: e.target.value })}
            placeholder="Type (VPN, Server, Database...)"
            className="h-10 border-border/50 shadow-none"
          />
          <Input
            value={values.username}
            onChange={(e) => onValuesChange({ ...values, username: e.target.value })}
            placeholder="Username"
            className="h-10 border-border/50 shadow-none"
          />
          <Input
            value={values.endpoint}
            onChange={(e) => onValuesChange({ ...values, endpoint: e.target.value })}
            placeholder="Endpoint / URL / Host"
            className="h-10 border-border/50 shadow-none"
          />
          <Input
            value={values.secret}
            onChange={(e) => onValuesChange({ ...values, secret: e.target.value })}
            placeholder="Secret / Password / Token"
            className="h-10 border-border/50 shadow-none sm:col-span-2"
          />
          <Textarea
            value={values.notes}
            onChange={(e) => onValuesChange({ ...values, notes: e.target.value })}
            placeholder="Notes"
            className="min-h-24 border-border/50 shadow-none sm:col-span-2"
          />
          <div className="sm:col-span-2 flex items-center justify-end gap-2">
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
              disabled={!values.name.trim() || !values.type.trim()}
            >
              Save credential
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}