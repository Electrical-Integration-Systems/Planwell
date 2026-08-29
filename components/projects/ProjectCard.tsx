"use client";

import Image from "next/image";
import Link from "next/link";
import { Archive, ArchiveRestore, ArrowRight, FolderKanban, ImageIcon, KeyRound, MapPin, Pencil, Server, Trash2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import BorderGlow from "@/components/BorderGlow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProjectCardProject = {
  _id: Id<"projects">;
  name: string;
  description?: string;
  location?: string;
  archived: boolean;
  updatedAt: number;
  bannerUrl?: string | null;
  taskCount: number;
  deviceCount: number;
  credentialCount: number;
  photoCount: number;
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ProjectCard({
  project,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  project: ProjectCardProject;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <BorderGlow
      className="h-full"
      animated
      backgroundColor="var(--card)"
      borderRadius={10}
      edgeSensitivity={5}
      glowColor="15 58 45"
      glowRadius={28}
      glowIntensity={1.1}
      coneSpread={35}
      colors={["#b84a30", "#d4922a", "#5c7a5c"]}
      fillOpacity={0.35}
    >
      <Card className="h-full gap-0 overflow-hidden border-0 bg-transparent py-0 shadow-none">
        {project.bannerUrl ? (
          <div className="relative h-32 overflow-hidden bg-muted/40">
            <Image
              src={project.bannerUrl}
              alt={`${project.name} banner`}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover"
            />
          </div>
        ) : null}
        <CardHeader className="pb-3 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="font-serif text-lg truncate">
                {project.name}
              </CardTitle>
              {project.location?.trim() ? (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{project.location}</span>
                </div>
              ) : null}
              {project.description?.trim() ? (
                <CardDescription className="mt-1 line-clamp-2 min-h-[2.5rem]">
                  {project.description.trim()}
                </CardDescription>
              ) : null}
            </div>
            {project.archived ? (
              <Badge variant="outline" className="shrink-0">
                Archived
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="gap-1.5">
              <FolderKanban className="h-3 w-3" />
              {project.taskCount} tasks
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <Server className="h-3 w-3" />
              {project.deviceCount} devices
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <KeyRound className="h-3 w-3" />
              {project.credentialCount} credentials
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <ImageIcon className="h-3 w-3" />
              {project.photoCount} photos
            </Badge>
          </div>

          <div className="flex items-center justify-end text-[11px] text-muted-foreground">
            <span>Updated {formatDate(project.updatedAt)}</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button asChild className="rounded-lg gap-1.5">
              <Link href={`/projects/${project._id}`}>
                Open project
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {project.archived ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={onRestore}
                >
                  <ArchiveRestore className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={onArchive}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              )}
              {project.archived ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </BorderGlow>
  );
}