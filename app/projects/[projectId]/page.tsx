"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Archive, Eye, EyeOff, ImageIcon, KeyRound, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { FilesBrowser } from "@/components/FilesBrowser";
import { PhotoBrowser } from "@/components/PhotoBrowser";
import { PlanwellLogoMark } from "@/components/PlanwellLogoMark";
import {
  CredentialEditorDialog,
  EMPTY_CREDENTIAL_FORM,
  type CredentialFormState,
} from "@/components/projects/CredentialEditorDialog";
import { ProjectDetailsHeader } from "@/components/projects/ProjectDetailsHeader";
import { ProjectBanner } from "@/components/ProjectBanner";
import { DeviceSpreadsheet } from "@/components/DeviceSpreadsheet";
import { ProjectUpdatesTab } from "@/components/ProjectUpdatesTab";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { TaskFilters } from "@/components/TaskFilters";
import { TaskList, TASK_GRID_COLS } from "@/components/TaskList";
import { TaskSort } from "@/components/TaskSort";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SortKey = {
	column: string;
	direction: "asc" | "desc";
};

type ProjectTaskFilters = {
	projectIds?: Id<"projects">[];
	excludeProjectIds?: Id<"projects">[];
	stateIds?: Id<"taskStates">[];
	excludeStateIds?: Id<"taskStates">[];
	priorityIds?: Id<"priorities">[];
	excludePriorityIds?: Id<"priorities">[];
	assigneeIds?: Id<"users">[];
	excludeAssigneeIds?: Id<"users">[];
	tagIds?: Id<"tags">[];
	excludeTagIds?: Id<"tags">[];
};

const CREDENTIAL_GRID_COLS = "minmax(0,1.3fr) 120px 130px minmax(0,1fr) 120px 96px";

function normalizeOptionalText(value: string) {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export default function ProjectDetailsPage() {
	const params = useParams<{ projectId: string }>();
	const projectId = params.projectId as Id<"projects">;

	const { isAuthenticated, isLoading } = useConvexAuth();
	const project = useQuery(api.projects.get, { id: projectId });
	const devices = useQuery(api.devices.listByProject, { projectId });
	const credentials = useQuery(api.credentials.listByProject, { projectId });
	const createDevice = useMutation(api.devices.create);
	const updateDevice = useMutation(api.devices.update);
	const removeDevice = useMutation(api.devices.remove);
	const createCredential = useMutation(api.credentials.create);
	const updateCredential = useMutation(api.credentials.update);
	const removeCredential = useMutation(api.credentials.remove);

	const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
	const [taskSearchQuery, setTaskSearchQuery] = useState("");
	const [credentialSearchQuery, setCredentialSearchQuery] = useState("");
	const [activeTaskTab, setActiveTaskTab] = useState<"active" | "archived">("active");
	const [projectTaskFilters, setProjectTaskFilters] = useState<ProjectTaskFilters>({});
	const [sortKeys, setSortKeys] = useState<SortKey[]>([]);
	const [isAddingTask, setIsAddingTask] = useState(false);
	const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
	const [editingCredentialId, setEditingCredentialId] = useState<Id<"projectCredentials"> | null>(null);
	const [credentialForm, setCredentialForm] = useState<CredentialFormState>(EMPTY_CREDENTIAL_FORM);
	const [revealedCredentials, setRevealedCredentials] = useState<Record<string, boolean>>({});
	const [confirmAction, setConfirmAction] = useState<{
		title: string;
		description: string;
		confirmLabel: string;
		onConfirm: () => Promise<void>;
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

	const scopedTaskFilters: ProjectTaskFilters = {
		...projectTaskFilters,
		projectIds: [projectId],
		excludeProjectIds: undefined,
	};

	const filteredCredentials =
		credentials === undefined
			? undefined
			: credentials.filter((credential) => {
					const query = credentialSearchQuery.toLowerCase().trim();
					if (query.length === 0) return true;

					return [
						credential.name,
						credential.type,
						credential.username,
						credential.endpoint,
						credential.notes,
					]
						.filter((value): value is string => typeof value === "string")
						.join(" ")
						.toLowerCase()
						.includes(query);
				});

	const openCredentialDialog = (
		credential?: NonNullable<typeof credentials>[number],
	) => {
		if (credential) {
			setEditingCredentialId(credential._id);
			setCredentialForm({
				name: credential.name,
				type: credential.type,
				username: credential.username ?? "",
				endpoint: credential.endpoint ?? "",
				secret: credential.secret ?? "",
				notes: credential.notes ?? "",
			});
		} else {
			setEditingCredentialId(null);
			setCredentialForm(EMPTY_CREDENTIAL_FORM);
		}
		setCredentialDialogOpen(true);
	};

	const handleSaveCredential = () => {
		const payload = {
			name: credentialForm.name.trim(),
			type: credentialForm.type.trim(),
			username: normalizeOptionalText(credentialForm.username),
			endpoint: normalizeOptionalText(credentialForm.endpoint),
			secret: normalizeOptionalText(credentialForm.secret),
			notes: normalizeOptionalText(credentialForm.notes),
		};

		if (editingCredentialId === null) {
			void createCredential({ projectId, ...payload })
				.then(() => {
					toast.success("Credential saved");
					setCredentialDialogOpen(false);
					setCredentialForm(EMPTY_CREDENTIAL_FORM);
				})
				.catch(() => toast.error("Failed to save credential"));
			return;
		}

		void updateCredential({ id: editingCredentialId, ...payload })
			.then(() => {
				toast.success("Credential updated");
				setCredentialDialogOpen(false);
				setEditingCredentialId(null);
				setCredentialForm(EMPTY_CREDENTIAL_FORM);
			})
			.catch(() => toast.error("Failed to update credential"));
	};

	const confirmDeleteCredential = (
		credentialId: Id<"projectCredentials">,
		credentialName: string,
	) => {
		setConfirmAction({
			title: "Delete credential?",
			description: `Delete \"${credentialName}\"? This cannot be undone.`,
			confirmLabel: "Delete credential",
			onConfirm: () =>
				removeCredential({ id: credentialId })
					.then(() => {
						toast.success("Credential deleted");
					})
					.catch(() => {
						toast.error("Failed to delete credential");
					}),
		});
	};

	return (
		<>
			<ProjectDetailsHeader project={project} />

				<div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-6 animate-fade-in-up stagger-3">
					{project === null ? (
						<Card className="border-border/50 shadow-warm-sm">
							<CardContent className="p-8 text-center text-sm text-muted-foreground">
								The selected project could not be found.
							</CardContent>
						</Card>
					) : project !== undefined ? (
						<>
							<ProjectBanner
								projectId={projectId}
								projectName={project.name}
								bannerUrl={project.bannerUrl}
							/>
							<Tabs defaultValue="tasks" className="gap-4">
								<TabsList variant="line" className="w-full justify-start overflow-x-auto rounded-none px-0">
									<TabsTrigger value="tasks" className="text-xs sm:text-sm">Tasks</TabsTrigger>
									<TabsTrigger value="files" className="text-xs sm:text-sm">Files</TabsTrigger>
									<TabsTrigger value="photos" className="text-xs sm:text-sm">Photos</TabsTrigger>
									<TabsTrigger value="devices" className="text-xs sm:text-sm">Devices</TabsTrigger>
									<TabsTrigger value="credentials" className="text-xs sm:text-sm">Credentials</TabsTrigger>
								<TabsTrigger value="updates" className="text-xs sm:text-sm">Updates</TabsTrigger>
								</TabsList>

								<TabsContent value="tasks" className="space-y-4">
									<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 pt-2">
										<div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
											<button
												className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
													activeTaskTab === "active"
														? "bg-background text-foreground shadow-sm"
														: "text-muted-foreground hover:text-foreground"
												}`}
												onClick={() => setActiveTaskTab("active")}
											>
												Active
											</button>
											<button
												className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
													activeTaskTab === "archived"
														? "bg-background text-foreground shadow-sm"
														: "text-muted-foreground hover:text-foreground"
												}`}
												onClick={() => setActiveTaskTab("archived")}
											>
												<Archive className="h-3 w-3" />
												Archived
											</button>
										</div>

										<div className="relative w-full sm:flex-1 sm:max-w-xs">
											<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
											<Input
												value={taskSearchQuery}
												onChange={(e) => setTaskSearchQuery(e.target.value)}
												placeholder="Search project tasks..."
												className="h-8 text-xs pl-8 border-border/50 bg-transparent shadow-none rounded-lg"
											/>
										</div>
										<Button
											size="sm"
											className="h-8 text-xs gap-1.5 rounded-lg px-3"
											onClick={() => setIsAddingTask(true)}
										>
											<Plus className="h-3.5 w-3.5" />
											Add task
										</Button>
									</div>

									<TaskFilters
										filters={projectTaskFilters}
										onFiltersChange={setProjectTaskFilters}
										showProjectFilter={false}
									/>

									<TaskSort sortKeys={sortKeys} onSortKeysChange={setSortKeys} />

									<div
										className="hidden md:grid items-center py-2.5 border-t border-border/30"
										style={{ gridTemplateColumns: TASK_GRID_COLS }}
									>
										<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</div>
										<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">State</div>
										<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</div>
										<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</div>
										<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assignees</div>
										<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</div>
										<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</div>
										<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Updated</div>
										<div />
									</div>

									<TaskList
										key={`${projectId}-${activeTaskTab}-${JSON.stringify(scopedTaskFilters)}-${JSON.stringify(sortKeys)}`}
										filters={scopedTaskFilters}
										sortKeys={sortKeys}
										onTaskSelect={setSelectedTaskId}
										isAddingTask={isAddingTask && activeTaskTab === "active"}
										onIsAddingTaskChange={setIsAddingTask}
										archived={activeTaskTab === "archived"}
										searchQuery={taskSearchQuery}
									/>
								</TabsContent>

								<TabsContent value="files" className="space-y-4">
									<FilesBrowser fixedProjectId={projectId} />
								</TabsContent>

								<TabsContent value="photos" className="space-y-4">
									<div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
										<ImageIcon className="h-3.5 w-3.5" />
										<span>Project photos include direct project uploads and photos attached to this project&apos;s tasks.</span>
									</div>
									<PhotoBrowser
										fixedProjectId={projectId}
										emptyTitle="No project photos yet"
										emptyDescription="Upload general project photos here. Task-specific photos will also appear in this tab."
										uploadLabel="Upload project photos"
									/>
								</TabsContent>

								<TabsContent value="devices">
									<DeviceSpreadsheet
										projectId={projectId}
										devices={devices ?? []}
										onCreate={(args) => createDevice(args)}
										onUpdate={(args) => updateDevice(args)}
										onDelete={(args) => removeDevice(args)}
									/>
								</TabsContent>

								<TabsContent value="credentials" className="space-y-4">
									<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 pt-2">
										{credentials !== undefined && credentials.length > 0 && (
											<div className="relative w-full sm:flex-1 sm:max-w-xs">
												<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
												<Input
													value={credentialSearchQuery}
													onChange={(e) => setCredentialSearchQuery(e.target.value)}
													placeholder="Search credentials..."
													className="h-8 text-xs pl-8 border-border/50 bg-transparent shadow-none rounded-lg"
												/>
											</div>
										)}

										<Button
											size="sm"
											className="h-8 text-xs gap-1.5 rounded-lg px-3"
											onClick={() => openCredentialDialog()}
										>
											<Plus className="h-3.5 w-3.5" />
											Add credential
										</Button>
									</div>

									{filteredCredentials !== undefined && filteredCredentials.length > 0 && (
										<div
											className="hidden md:grid items-center py-2.5 border-t border-border/30 gap-3"
											style={{ gridTemplateColumns: CREDENTIAL_GRID_COLS }}
										>
											<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entry</div>
											<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</div>
											<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Username</div>
											<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Endpoint</div>
											<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Secret</div>
											<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Actions</div>
										</div>
									)}

									{credentials === undefined ? (
										<div className="p-8 text-center text-sm text-muted-foreground">Loading credentials...</div>
									) : filteredCredentials !== undefined && filteredCredentials.length === 0 ? (
										<div className="py-16 text-center border border-dashed border-primary/30 rounded-lg bg-primary/5">
											<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
												<KeyRound className="h-5 w-5 text-primary/60" />
											</div>
											<p className="text-sm text-muted-foreground">
												{credentialSearchQuery.trim().length > 0 ? "No matching credentials" : "No credentials yet"}
											</p>
											<p className="text-xs text-muted-foreground/60 mt-1">
												Store VPN, server, database, or vendor access details for this project
											</p>
										</div>
									) : (
										<div>
											{filteredCredentials?.map((credential, index) => {
												const isRevealed = revealedCredentials[credential._id] ?? false;
												const displayedSecret = isRevealed
													? credential.secret ?? "—"
													: credential.secret
														? "••••••"
														: "—";

												return (
													<div key={credential._id}>
														<div
															className="md:hidden border-b border-border/50 transition-colors hover:bg-muted/50 animate-fade-in p-3"
															style={{ animationDelay: `${Math.min(index, 20) * 25}ms` }}
														>
															<div className="flex items-start justify-between gap-3">
																<div className="min-w-0 flex-1">
																	<p className="font-medium text-sm truncate">{credential.name}</p>
																	<div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
																		<span>{credential.type}</span>
																		<span>{credential.username || "No username"}</span>
																	</div>
																	<div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
																		<span className="truncate">{credential.endpoint || "No endpoint"}</span>
																	</div>
																	{credential.notes && (
																		<p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{credential.notes}</p>
																	)}
																</div>
																<div className="flex items-center gap-1 shrink-0">
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-7 w-7 rounded-lg"
																		onClick={() =>
																			setRevealedCredentials((current) => ({
																				...current,
																				[credential._id]: !isRevealed,
																			}))
																		}
																	>
																		{isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
																	</Button>
																	<Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => openCredentialDialog(credential)}>
																		<Pencil className="h-3.5 w-3.5" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
																		onClick={() => confirmDeleteCredential(credential._id, credential.name)}
																	>
																		<Trash2 className="h-3.5 w-3.5" />
																	</Button>
																</div>
															</div>
															<div className="mt-2 text-[11px] text-muted-foreground">
																Secret: {displayedSecret}
															</div>
														</div>

														<div
															className="hidden md:grid items-start py-2.5 border-b border-border/50 transition-colors hover:bg-muted/50 animate-fade-in gap-3"
															style={{
																gridTemplateColumns: CREDENTIAL_GRID_COLS,
																animationDelay: `${Math.min(index, 20) * 25}ms`,
															}}
														>
															<div className="min-w-0 pr-2">
																<p className="font-medium text-sm truncate">{credential.name}</p>
																{credential.notes && (
																	<p className="mt-1 text-xs text-muted-foreground line-clamp-2">{credential.notes}</p>
																)}
															</div>
															<div className="text-xs text-muted-foreground pt-1">{credential.type}</div>
															<div className="text-xs text-muted-foreground pt-1 truncate pr-2">{credential.username || "—"}</div>
															<div className="text-xs text-muted-foreground pt-1 truncate pr-2">{credential.endpoint || "—"}</div>
															<div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
																<span>{displayedSecret}</span>
																{credential.secret && (
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-6 w-6 rounded-lg"
																		onClick={() =>
																			setRevealedCredentials((current) => ({
																				...current,
																				[credential._id]: !isRevealed,
																			}))
																		}
																	>
																		{isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
																	</Button>
																)}
															</div>
															<div className="flex items-center justify-end gap-1">
																<Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => openCredentialDialog(credential)}>
																	<Pencil className="h-3.5 w-3.5" />
																</Button>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
																	onClick={() => confirmDeleteCredential(credential._id, credential.name)}
																>
																	<Trash2 className="h-3.5 w-3.5" />
																</Button>
															</div>
														</div>
													</div>
												);
											})}
										</div>
									)}
								</TabsContent>

								<TabsContent value="updates">
									<ProjectUpdatesTab projectId={projectId} />
								</TabsContent>
							</Tabs>
						</>
					) : (
						<div className="p-8 text-center text-sm text-muted-foreground">Loading project details...</div>
					)}
				</div>

			{selectedTaskId !== null && (
				<TaskDetailDialog
					taskId={selectedTaskId}
					open={selectedTaskId !== null}
					onOpenChange={(open: boolean) => {
						if (!open) setSelectedTaskId(null);
					}}
				/>
			)}

			<CredentialEditorDialog
				open={credentialDialogOpen}
				onOpenChange={setCredentialDialogOpen}
				values={credentialForm}
				onValuesChange={setCredentialForm}
				onSubmit={handleSaveCredential}
			/>
			<ConfirmActionDialog
				open={confirmAction !== null}
				onOpenChange={(open) => {
					if (!open) {
						setConfirmAction(null);
					}
				}}
				title={confirmAction?.title ?? ""}
				description={confirmAction?.description ?? ""}
				confirmLabel={confirmAction?.confirmLabel ?? "Confirm"}
				onConfirm={confirmAction?.onConfirm ?? (() => Promise.resolve())}
			/>
		</>
	);
}
