"use client";

import { Archive, FileText, FolderKanban, ImageIcon, KeyRound, MapPin, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ProjectDetailsHeaderProject = {
  name: string;
  archived: boolean;
  location?: string;
  description?: string;
  taskCount: number;
  activeTaskCount: number;
  archivedTaskCount: number;
  deviceCount: number;
  credentialCount: number;
  fileCount: number;
  photoCount: number;
};

export function ProjectDetailsHeader({
  project,
}: {
  project: ProjectDetailsHeaderProject | null | undefined;
}) {
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40">
      <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8">
        <div className="pt-4 sm:pt-5 pb-3 animate-fade-in-up space-y-3">
          {project === undefined ? (
            <div className="text-sm text-muted-foreground">Loading project...</div>
          ) : project === null ? (
            <div className="text-sm text-muted-foreground">Project not found.</div>
          ) : (
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-serif text-xl sm:text-2xl tracking-tight flex items-center gap-2">
                    {project.name}
                    <span className="h-[2px] flex-1 max-w-[80px] bg-gradient-to-r from-primary/60 to-transparent rounded-full" />
                  </h2>
                  {project.archived ? <Badge variant="outline">Archived</Badge> : null}
                </div>
                {project.location?.trim() ? (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{project.location}</span>
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
                  {project.description?.trim() || ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="h-7 px-2.5 gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5" />
                  {project.taskCount} tasks
                </Badge>
                <Badge variant="outline" className="h-7 px-2.5 gap-1.5">
                  <Archive className="h-3.5 w-3.5" />
                  {project.activeTaskCount} active
                </Badge>
                <Badge variant="outline" className="h-7 px-2.5 gap-1.5">
                  <Archive className="h-3.5 w-3.5" />
                  {project.archivedTaskCount} archived
                </Badge>
                <Badge variant="outline" className="h-7 px-2.5 gap-1.5">
                  <Server className="h-3.5 w-3.5" />
                  {project.deviceCount} devices
                </Badge>
                <Badge variant="outline" className="h-7 px-2.5 gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  {project.credentialCount} credentials
                </Badge>
                <Badge variant="outline" className="h-7 px-2.5 gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {project.fileCount} files
                </Badge>
                <Badge variant="outline" className="h-7 px-2.5 gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {project.photoCount} photos
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}