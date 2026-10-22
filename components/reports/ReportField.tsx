"use client";

import { useId } from "react";
import type { ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ReportField({ label, value, onChange, multiline = false, type = "text", required = false, disabled = false, placeholder, maxLength = 20000, error, hint, fieldName }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: "text" | "date" | "email" | "number";
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  error?: string;
  hint?: string;
  fieldName?: string;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  const props = { id, value, disabled, required, placeholder, maxLength, "aria-invalid": Boolean(error), "aria-describedby": error || hint ? messageId : undefined, "data-report-field": fieldName, onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value) };
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}{required ? " *" : ""}</Label>
      {multiline ? <Textarea {...props} rows={4} className="min-h-28 rounded-xl" /> : <Input {...props} type={type} step={type === "number" ? "any" : undefined} min={type === "number" ? "0.001" : undefined} className="rounded-xl" />}
      {(error || hint) && <p id={messageId} className={error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{error || hint}</p>}
    </div>
  );
}
