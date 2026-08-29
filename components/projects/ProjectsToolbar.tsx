"use client";

import { Archive, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProjectsToolbar({
  activeTab,
  searchQuery,
  onActiveTabChange,
  onSearchQueryChange,
  showSearch,
  onAddProject,
}: {
  activeTab: "active" | "archived";
  searchQuery: string;
  onActiveTabChange: (value: "active" | "archived") => void;
  onSearchQueryChange: (value: string) => void;
  showSearch: boolean;
  onAddProject: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40">
      <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 py-3 animate-fade-in-up">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === "active"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => onActiveTabChange("active")}
            >
              Active
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === "archived"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => onActiveTabChange("archived")}
            >
              <Archive className="h-3 w-3" />
              Archived
            </button>
          </div>

          {showSearch ? (
            <div className="relative w-full sm:flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Search projects..."
                className="h-8 text-xs pl-8 border-border/50 bg-transparent shadow-none rounded-lg"
              />
            </div>
          ) : null}

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 rounded-lg px-3 sm:ml-auto"
            onClick={onAddProject}
          >
            Add project
          </Button>
        </div>
      </div>
    </div>
  );
}