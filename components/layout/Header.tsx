"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  "/": "Projects",
  "/tasks": "Tasks",
  "/files": "Files",
  "/projects": "Projects",
  "/audit-history": "Audit History",
};

export function Header() {
  const pathname = usePathname();
  const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);
  const projectId = projectMatch?.[1] as Id<"projects"> | undefined;
  const project = useQuery(
    api.projects.get,
    projectId ? { id: projectId } : "skip",
  );
  const currentLabel = projectId
    ? project?.name ?? "Project"
    : routeLabels[pathname] ?? "Workspace";
  const showRoot = pathname !== "/";

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border/50 bg-background/95 px-3 backdrop-blur-sm sm:px-6 lg:px-8">
      <Breadcrumb>
        <BreadcrumbList>
          {showRoot ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Projects</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          ) : null}
          <BreadcrumbItem>
            <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}