"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { FolderKanban, Search } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { PlanwellLogoMark } from "@/components/PlanwellLogoMark";
import { ProjectCard } from "@/components/projects/ProjectCard";
import {
  EMPTY_PROJECT_FORM,
  ProjectEditorDialog,
  type ProjectFormState,
} from "@/components/projects/ProjectEditorDialog";
import { ProjectsToolbar } from "@/components/projects/ProjectsToolbar";

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function Projects() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const projects = useQuery(api.projects.listWithStats, { includeArchived: true });
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const archiveProject = useMutation(api.projects.archive);
  const deleteProject = useMutation(api.projects.remove);
  const unarchiveProject = useMutation(api.projects.unarchive);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<Id<"projects"> | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(EMPTY_PROJECT_FORM);
  const [pendingArchive, setPendingArchive] = useState<{
	id: Id<"projects">;
	name: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
	id: Id<"projects">;
	name: string;
  } | null>(null);

  if (isLoading) {
	return (
	  <div className="flex items-center justify-center min-h-screen">
		<div className="flex flex-col items-center gap-3 animate-fade-in">
		  <PlanwellLogoMark size="sm" />
		  <p className="text-xs text-muted-foreground tracking-wide">
			Loading...
		  </p>
		</div>
	  </div>
	);
  }

  if (!isAuthenticated) return null;

  const visibleProjects =
	projects === undefined
	  ? undefined
	  : projects
		  .filter((project) =>
			activeTab === "archived" ? project.archived : !project.archived,
		  )
		  .filter((project) => {
			const query = searchQuery.toLowerCase().trim();
			if (query.length === 0) return true;

			return (
			  project.name.toLowerCase().includes(query) ||
			  (project.description ?? "").toLowerCase().includes(query) ||
			  (project.location ?? "").toLowerCase().includes(query)
			);
		  })
		  .sort((a, b) => b.updatedAt - a.updatedAt);

  const handleCreate = () => {
	void createProject({
	  name: projectForm.name.trim(),
	  description: normalizeOptionalText(projectForm.description),
	  location: normalizeOptionalText(projectForm.location),
	})
	  .then(() => {
		toast.success("Project created");
		setEditorOpen(false);
		setProjectForm(EMPTY_PROJECT_FORM);
	  })
	  .catch(() => toast.error("Failed to create project"));
  };

  const handleUpdate = () => {
	if (editingProjectId === null) return;

	void updateProject({
	  id: editingProjectId,
	  name: projectForm.name.trim(),
	  description: normalizeOptionalText(projectForm.description),
	  location: normalizeOptionalText(projectForm.location),
	})
	  .then(() => {
		toast.success("Project updated");
		setEditorOpen(false);
		setEditingProjectId(null);
		setProjectForm(EMPTY_PROJECT_FORM);
	  })
	  .catch(() => toast.error("Failed to update project"));
  };

  return (
	<>
	  <ProjectsToolbar
		activeTab={activeTab}
		searchQuery={searchQuery}
		onActiveTabChange={setActiveTab}
		onSearchQueryChange={setSearchQuery}
		showSearch={projects !== undefined && projects.length > 0}
		onAddProject={() => {
		  setEditingProjectId(null);
		  setProjectForm(EMPTY_PROJECT_FORM);
		  setEditorOpen(true);
		}}
	  />

	  <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-6 animate-fade-in-up stagger-3">
		{projects === undefined ? (
		  <div className="p-8 text-center text-sm text-muted-foreground">
			Loading projects...
		  </div>
		) : projects.length === 0 ? (
		  <div className="py-16 text-center border border-dashed border-primary/30 rounded-lg bg-primary/5">
			<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
			  <FolderKanban className="h-5 w-5 text-primary/60" />
			</div>
			<p className="text-sm text-muted-foreground">No projects yet</p>
			<p className="text-xs text-muted-foreground/60 mt-1">
			  Create a project to start grouping tasks, devices, and credentials
			</p>
		  </div>
		) : visibleProjects !== undefined && visibleProjects.length === 0 ? (
		  <div className="p-12 text-center">
			<Search className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
			<p className="text-sm text-muted-foreground">
			  No projects matching &ldquo;{searchQuery}&rdquo;
			</p>
		  </div>
		) : (
		  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{visibleProjects?.map((project) => (
			  <ProjectCard
				key={project._id}
				project={project}
				onEdit={() => {
				  setEditingProjectId(project._id);
				  setProjectForm({
					name: project.name,
					description: project.description ?? "",
					location: project.location ?? "",
				  });
				  setEditorOpen(true);
				}}
				onArchive={() => {
				  setPendingArchive({ id: project._id, name: project.name });
				}}
				onRestore={() => {
				  void unarchiveProject({ id: project._id })
					.then(() => toast.success("Project restored"))
					.catch(() => toast.error("Failed to restore project"));
				}}
				onDelete={() => {
				  setPendingDelete({ id: project._id, name: project.name });
				}}
			  />
			))}
		  </div>
		)}
	  </div>

	  <ProjectEditorDialog
		open={editorOpen}
		onOpenChange={setEditorOpen}
		title={editingProjectId === null ? "Create Project" : "Edit Project"}
		values={projectForm}
		onValuesChange={setProjectForm}
		onSubmit={editingProjectId === null ? handleCreate : handleUpdate}
	  />
	  <ConfirmActionDialog
		open={pendingArchive !== null}
		onOpenChange={(open) => {
		  if (!open) {
			setPendingArchive(null);
		  }
		}}
		title="Archive project?"
		description={
		  pendingArchive
			? `Archive \"${pendingArchive.name}\"? You can restore it later.`
			: ""
		}
		confirmLabel="Archive project"
		onConfirm={() =>
		  pendingArchive
			? archiveProject({ id: pendingArchive.id })
				.then(() => {
				  toast.success("Project archived");
				})
				.catch(() => {
				  toast.error("Failed to archive project");
				})
			: Promise.resolve()
		}
	  />
	  <ConfirmActionDialog
		open={pendingDelete !== null}
		onOpenChange={(open) => {
		  if (!open) {
			setPendingDelete(null);
		  }
		}}
		title="Delete project?"
		description={
		  pendingDelete
			? `Delete \"${pendingDelete.name}\"? This permanently removes the project and its tasks, files, photos, devices, and credentials.`
			: ""
		}
		requiredText={
		  pendingDelete
			? `Delete project ${pendingDelete.name} and all its associated data.`
			: undefined
		}
		requiredTextLabel="Type the exact sentence below to confirm this destructive action."
		confirmLabel="Delete project"
		onConfirm={() =>
		  pendingDelete
			? deleteProject({ id: pendingDelete.id })
				.then(() => {
				  toast.success("Project deleted");
				})
				.catch(() => {
				  toast.error("Failed to delete project");
				})
			: Promise.resolve()
		}
	  />
	</>
  );
}