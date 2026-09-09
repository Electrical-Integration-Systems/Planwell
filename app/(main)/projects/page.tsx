"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Archive, ArchiveRestore, ArrowRight, FolderKanban, ImageIcon, KeyRound, MapPin, Pencil, Search, Server, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { Header } from "@/components/layout/Header";
import { PlanwellLogoMark } from "@/components/PlanwellLogoMark";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectFormState } from "@/types/projects";

const EMPTY_PROJECT_FORM: ProjectFormState = {
	name: "",
	description: "",
	location: "",
};

function formatDate(ts: number) {
	return new Date(ts).toLocaleDateString("ro-RO", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function normalizeOptionalText(value: string) {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function ProjectEditorDialog({
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

export default function ProjectsPage() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const projects = useQuery(api.projects.listWithStats, { includeArchived: true });
	const createProject = useMutation(api.projects.create);
	const updateProject = useMutation(api.projects.update);
	const archiveProject = useMutation(api.projects.archive);
	const deleteProject = useMutation(api.projects.remove);
	const unarchiveProject = useMutation(api.projects.unarchive);

	const [settingsOpen, setSettingsOpen] = useState(false);
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
		<div className="h-dvh flex flex-col">
			<Header
				onSettingsOpen={() => setSettingsOpen(true)}
				isSettingsOpen={settingsOpen}
			/>

			<main className="flex-1 overflow-y-auto">
				<div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40">
					<div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8">
						<div className="flex items-end justify-between pt-4 sm:pt-5 pb-2 sm:pb-3 animate-fade-in-up gap-3">
							<div>
								<h2 className="font-serif text-xl sm:text-2xl tracking-tight flex items-center gap-2">
									Projects
									<span className="h-[2px] flex-1 max-w-[80px] bg-gradient-to-r from-primary/60 to-transparent rounded-full" />
								</h2>
								<p className="text-xs text-muted-foreground mt-1">
									Organize your workspaces, infrastructure, and access details by project
								</p>
							</div>
							<Button
								size="sm"
								className="h-8 text-xs gap-1.5 rounded-lg px-3"
								onClick={() => {
									setEditingProjectId(null);
									setProjectForm(EMPTY_PROJECT_FORM);
									setEditorOpen(true);
								}}
							>
								Add project
							</Button>
						</div>

						<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 pt-2 pb-2">
							<div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
								<button
									className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
										activeTab === "active"
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									}`}
									onClick={() => setActiveTab("active")}
								>
									Active
								</button>
								<button
									className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
										activeTab === "archived"
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									}`}
									onClick={() => setActiveTab("archived")}
								>
									<Archive className="h-3 w-3" />
									Archived
								</button>
							</div>

							{projects !== undefined && projects.length > 0 && (
								<div className="relative w-full sm:flex-1 sm:max-w-xs">
									<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
									<Input
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Search projects..."
										className="h-8 text-xs pl-8 border-border/50 bg-transparent shadow-none rounded-lg"
									/>
								</div>
							)}
						</div>
					</div>
				</div>

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
								<Card
									key={project._id}
									className="border-border/50 shadow-warm-sm hover:shadow-warm transition-all bg-card/60"
								>
									<CardHeader className="pb-3">
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
											{project.archived && (
												<Badge variant="outline" className="shrink-0">
													Archived
												</Badge>
											)}
										</div>
									</CardHeader>
									<CardContent className="space-y-4">
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
													onClick={() => {
														setEditingProjectId(project._id);
														setProjectForm({
															name: project.name,
															description: project.description ?? "",
															location: project.location ?? "",
														});
														setEditorOpen(true);
													}}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												{project.archived ? (
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 rounded-lg"
														onClick={() => {
															void unarchiveProject({ id: project._id })
																.then(() => toast.success("Project restored"))
																.catch(() => toast.error("Failed to restore project"));
														}}
													>
														<ArchiveRestore className="h-4 w-4" />
													</Button>
												) : (
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
														onClick={() => {
															setPendingArchive({ id: project._id, name: project.name });
														}}
													>
														<Archive className="h-4 w-4" />
													</Button>
												)}
												{project.archived ? (
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
														onClick={() => {
															setPendingDelete({ id: project._id, name: project.name });
														}}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												) : null}
											</div>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</div>
			</main>

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
			<SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
		</div>
	);
}
