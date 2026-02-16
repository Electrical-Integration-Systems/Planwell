"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, X, Plus, ChevronUp, ChevronDown } from "lucide-react";

type SortKey = {
  column: string;
  direction: "asc" | "desc";
};

const SORTABLE_COLUMNS = [
  { value: "title", label: "Title" },
  { value: "state", label: "State" },
  { value: "priority", label: "Priority" },
  { value: "project", label: "Project" },
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Updated" },
];

export function TaskSort({
  sortKeys,
  onSortKeysChange,
}: {
  sortKeys: SortKey[];
  onSortKeysChange: (keys: SortKey[]) => void;
}) {
  const addSortKey = () => {
    const usedColumns = new Set(sortKeys.map((k) => k.column));
    const available = SORTABLE_COLUMNS.find((c) => !usedColumns.has(c.value));
    if (available) {
      onSortKeysChange([
        ...sortKeys,
        { column: available.value, direction: "asc" },
      ]);
    }
  };

  const removeSortKey = (index: number) => {
    onSortKeysChange(sortKeys.filter((_, i) => i !== index));
  };

  const updateSortKey = (index: number, updates: Partial<SortKey>) => {
    onSortKeysChange(
      sortKeys.map((key, i) => (i === index ? { ...key, ...updates } : key)),
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-primary mr-1">
        <ArrowUpDown className="h-3.5 w-3.5" />
        <span className="text-[11px] uppercase tracking-wider font-medium">
          Sort
        </span>
      </div>

      {sortKeys.map((key, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mx-0.5">
              then
            </span>
          )}
          <Select
            value={key.column}
            onValueChange={(val) => updateSortKey(index, { column: val })}
          >
            <SelectTrigger className="w-[100px] h-7 text-xs border-border/50 bg-transparent shadow-none rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTABLE_COLUMNS.map((col) => (
                <SelectItem key={col.value} value={col.value}>
                  {col.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2 border-border/50 shadow-none rounded-lg gap-1"
            onClick={() =>
              updateSortKey(index, {
                direction: key.direction === "asc" ? "desc" : "asc",
              })
            }
          >
            {key.direction === "asc" ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Asc
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Desc
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => removeSortKey(index)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {sortKeys.length < SORTABLE_COLUMNS.length && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 border-border/50 shadow-none rounded-lg border-dashed"
          onClick={addSortKey}
        >
          <Plus className="h-3 w-3" />
          Add sort
        </Button>
      )}

      {sortKeys.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-lg"
          onClick={() => onSortKeysChange([])}
        >
          Clear
          <Badge className="ml-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full bg-primary text-primary-foreground">
            {sortKeys.length}
          </Badge>
        </Button>
      )}
    </div>
  );
}
