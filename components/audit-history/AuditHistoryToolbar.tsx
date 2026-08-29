"use client";

import { Search } from "lucide-react";
import { AUDIT_GRID_COLS, ENTITY_TYPES } from "@/components/AuditHistoryList";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AuditHistoryToolbar({
  entityFilter,
  onEntityFilterChange,
  searchQuery,
  onSearchQueryChange,
  showSearch,
}: {
  entityFilter: string;
  onEntityFilterChange: (value: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  showSearch: boolean;
}) {
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40">
      <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 py-3 animate-fade-in-up">
          {showSearch ? (
            <div className="relative w-full sm:flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search audit history..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="h-8 text-xs pl-8 border-border/50 bg-transparent shadow-none rounded-lg"
              />
            </div>
          ) : null}
          <Select value={entityFilter} onValueChange={onEntityFilterChange}>
            <SelectTrigger className="h-8 w-full sm:w-[160px] text-xs border-border/50 bg-transparent shadow-none rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((entityType) => (
                <SelectItem key={entityType.value} value={entityType.value}>
                  {entityType.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showSearch ? (
          <div
            className="hidden md:grid items-center py-2.5 border-t border-border/30 gap-3"
            style={{ gridTemplateColumns: AUDIT_GRID_COLS }}
          >
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Event</div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entity</div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User</div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}