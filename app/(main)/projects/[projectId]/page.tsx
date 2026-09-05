"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Archive, ArrowLeft, Copy, Eye, EyeOff, FileText, FolderKanban, ImageIcon, KeyRound, Link2, MapPin, Pencil, Plus, Search, Server, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { CredentialShareDialog } from "@/components/CredentialShareDialog";
import { CredentialSharedLinks } from "@/components/CredentialSharedLinks";
import { FilesBrowser } from "@/components/FilesBrowser";
import { Header } from "@/components/layout/Header";
import { PhotoBrowser } from "@/components/PhotoBrowser";
import { PlanwellLogoMark } from "@/components/PlanwellLogoMark";
import { SettingsDialog } from "@/components/SettingsDialog";
import { DeviceSpreadsheet } from "@/components/DeviceSpreadsheet";
import { ProjectUpdatesTab } from "@/components/ProjectUpdatesTab";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { TaskFilters } from "@/components/TaskFilters";
import { TaskList, TASK_GRID_COLS } from "@/components/TaskList";
import { TaskSort } from "@/components/TaskSort";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { CredentialFields, CredentialFormState } from "@/types/credentials";
import type { TaskFilterState, TaskSortKey } from "@/types/tasks";

const CREDENTIAL_GRID_COLS = "minmax(180px,1fr) 100px 120px minmax(140px,0.75fr) minmax(260px,2fr) 152px";

const EMPTY_CREDENTIAL_FORM: CredentialFormState = {
	name: "",
	type: "",
	username: "",
	endpoint: "",
	secret: "",
	notes: "",
};

function normalizeOptionalText(value: string) {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function formatCredentialForClipboard(credential: CredentialFields) {
	const fields = [
		{ label: "NAME", value: credential.name },
		{ label: "TYPE", value: credential.type },
		{ label: "USERNAME", value: credential.username },
		{ label: "ENDPOINT", value: credential.endpoint },
		{ label: "SECRET", value: credential.secret },
		{ label: "NOTES", value: credential.notes },
	];

	return fields
		.filter(({ value }) => value?.trim())
		.map(({ label, value }) => `${label}: ${value}`)
		.join("\n");
}

function CredentialEditorDialog({
	open,
	onOpenChange,
	values,
	onValuesChange,
	onSubmit,
	secretVisible,
	onSecretVisibleChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	values: CredentialFormState;
	onValuesChange: (values: CredentialFormState) => void;
	onSubmit: () => void;
	secretVisible: boolean;
	onSecretVisibleChange: (visible: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[640px] border-border/60 shadow-warm-lg">
				<DialogHeader>
					<DialogTitle className="font-serif text-xl tracking-tight">
						Credential entry
					</DialogTitle>
				</DialogHeader>
				<div className="grid gap-3 sm:grid-cols-2">
					<Input
						value={values.name}
						onChange={(e) => onValuesChange({ ...values, name: e.target.value })}
						placeholder="Credential name"
						className="h-10 border-border/50 shadow-none"
					/>
					<Input
						value={values.type}
						onChange={(e) => onValuesChange({ ...values, type: e.target.value })}
						placeholder="Type (VPN, Server, Database...)"
						className="h-10 border-border/50 shadow-none"
					/>
					<Input
						value={values.username}
						onChange={(e) =>
							onValuesChange({ ...values, username: e.target.value })
						}
						placeholder="Username"
						className="h-10 border-border/50 shadow-none"
					/>
					<Input
						value={values.endpoint}
						onChange={(e) =>
							onValuesChange({ ...values, endpoint: e.target.value })
						}
						placeholder="Endpoint / URL / Host"
						className="h-10 border-border/50 shadow-none"
					/>
					<div className="relative sm:col-span-2">
						<Input
							type={secretVisible ? "text" : "password"}
							value={values.secret}
							onChange={(e) => onValuesChange({ ...values, secret: e.target.value })}
							placeholder="Secret / Password / Token"
							className="h-10 border-border/50 pr-10 shadow-none"
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="absolute right-1 top-1 h-8 w-8"
							onClick={() => onSecretVisibleChange(!secretVisible)}
							aria-label={secretVisible ? "Hide secret" : "Reveal secret"}
							title={secretVisible ? "Hide secret" : "Reveal secret"}
						>
							{secretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
						</Button>
					</div>
					<Textarea
						value={values.notes}
						onChange={(e) => onValuesChange({ ...values, notes: e.target.value })}
						placeholder="Notes"
						className="min-h-24 border-border/50 shadow-none sm:col-span-2"
					/>
					<div className="sm:col-span-2 flex items-center justify-end gap-2">
						<Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							className="rounded-lg"
							onClick={onSubmit}
							disabled={!values.name.trim() || !values.type.trim()}
						>
							Save credential
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
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

	const [settingsOpen, setSettingsOpen] = useState(false);
	const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
	const [taskSearchQuery, setTaskSearchQuery] = useState("");
	const [credentialSearchQuery, setCredentialSearchQuery] = useState("");
	const [activeTaskTab, setActiveTaskTab] = useState<"active" | "archived">("active");
	const [activeCredentialView, setActiveCredentialView] = useState<"entries" | "shared-links">("entries");
	const [projectTaskFilters, setProjectTaskFilters] = useState<TaskFilterState>({});
	const [sortKeys, setSortKeys] = useState<TaskSortKey[]>([]);
	const [isAddingTask, setIsAddingTask] = useState(false);
	const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
	const [credentialShareDialogOpen, setCredentialShareDialogOpen] = useState(false);
	const [credentialSecretVisible, setCredentialSecretVisible] = useState(false);
	const [editingCredentialId, setEditingCredentialId] = useState<Id<"projectCredentials"> | null>(null);
	const [credentialForm, setCredentialForm] = useState<CredentialFormState>(EMPTY_CREDENTIAL_FORM);
	const [revealedCredentials, setRevealedCredentials] = useState<Record<string, boolean>>({});
	const [selectedCredentialIds, setSelectedCredentialIds] = useState<Id<"projectCredentials">[]>([]);
	const [credentialIdsToShare, setCredentialIdsToShare] = useState<Id<"projectCredentials">[]>([]);
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

	const scopedTaskFilters: TaskFilterState = {
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
	const selectedCredentials = (credentials ?? [])
		.filter((credential) => credentialIdsToShare.includes(credential._id))
		.map((credential) => ({ id: credential._id, name: credential.name }));

	const setCredentialSelected = (
		credentialId: Id<"projectCredentials">,
		selected: boolean,
	) => {
		setSelectedCredentialIds((current) => {
			if (!selected) return current.filter((id) => id !== credentialId);
			if (current.includes(credentialId)) return current;
			return [...current, credentialId];
		});
	};

	const openCredentialShareDialog = (credentialIds: Id<"projectCredentials">[]) => {
		if (credentialIds.length < 1) return;
		if (credentialIds.length > 20) {
			toast.error("A share can contain at most 20 credentials");
			return;
		}
		setCredentialIdsToShare(credentialIds);
		setCredentialShareDialogOpen(true);
	};

	const openCredentialDialog = (
		credential?: NonNullable<typeof credentials>[number],
	) => {
		setCredentialSecretVisible(false);
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

		void updateCredential({
			id: editingCredentialId,
			name: payload.name,
			type: payload.type,
			username: payload.username ?? null,
			endpoint: payload.endpoint ?? null,
			secret: payload.secret ?? null,
			notes: payload.notes ?? null,
		})
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
						setSelectedCredentialIds((current) =>
							current.filter((id) => id !== credentialId),
						);
						toast.success("Credential deleted");
					})
					.catch(() => {
						toast.error("Failed to delete credential");
					}),
		});
	};

	const handleCopySelectedCredentials = () => {
		const selected = (credentials ?? []).filter((credential) =>
			selectedCredentialIds.includes(credential._id),
		);
		if (selected.length === 0) return;
		if (!navigator.clipboard) {
			toast.error("Clipboard access is unavailable");
			return;
		}

		void navigator.clipboard
			.writeText(selected.map(formatCredentialForClipboard).join("\n\n---\n\n"))
			.then(() => toast.success(`${selected.length} credentials copied`))
			.catch(() => toast.error("Failed to copy credentials"));
	};

	const confirmDeleteSelectedCredentials = () => {
		const ids = [...selectedCredentialIds];
		if (ids.length === 0) return;
		setConfirmAction({
			title: `Delete ${ids.length} credentials?`,
			description: "The selected credential entries will be permanently deleted. This cannot be undone.",
			confirmLabel: "Delete credentials",
			onConfirm: () =>
				Promise.all(ids.map((id) => removeCredential({ id })))
					.then(() => {
						setSelectedCredentialIds([]);
						toast.success(`${ids.length} credentials deleted`);
					})
					.catch(() => {
						toast.error("Failed to delete selected credentials");
					}),
		});
	};

	const handleCopyCredential = (
		credential: NonNullable<typeof credentials>[number],
	) => {
		if (!navigator.clipboard) {
			toast.error("Clipboard access is unavailable");
			return;
		}

		void navigator.clipboard
			.writeText(formatCredentialForClipboard(credential))
			.then(() => toast.success("Credential copied"))
			.catch(() => toast.error("Failed to copy credential"));
	};

	const handleCopySecret = (secret: string) => {
		if (!navigator.clipboard) {
			toast.error("Clipboard access is unavailable");
			return;
		}

		void navigator.clipboard
			.writeText(secret)
			.then(() => toast.success("Secret copied"))
			.catch(() => toast.error("Failed to copy secret"));
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
						<div className="pt-4 sm:pt-5 pb-3 animate-fade-in-up space-y-3">
							<Button variant="ghost" size="sm" className="h-7 px-2 rounded-lg text-xs gap-1.5" asChild>
								<Link href="/projects">
									<ArrowLeft className="h-3.5 w-3.5" />
									Back to projects
								</Link>
							</Button>

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
											{project.archived && <Badge variant="outline">Archived</Badge>}
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

				<div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-6 animate-fade-in-up stagger-3">
					{project === null ? (
						<Card className="border-border/50 shadow-warm-sm">
							<CardContent className="p-8 text-center text-sm text-muted-foreground">
								The selected project could not be found.
							</CardContent>
						</Card>
					) : project !== undefined ? (
						<>
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
									<div className="flex w-fit items-center gap-1 rounded-lg bg-muted/50 p-0.5">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className={`h-7 rounded-md px-3 text-xs font-medium ${
												activeCredentialView === "entries"
													? "bg-background text-foreground shadow-sm hover:bg-background"
													: "text-muted-foreground hover:text-foreground"
											}`}
											onClick={() => setActiveCredentialView("entries")}
											aria-pressed={activeCredentialView === "entries"}
										>
											Entries
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className={`h-7 gap-1.5 rounded-md px-3 text-xs font-medium ${
												activeCredentialView === "shared-links"
													? "bg-background text-foreground shadow-sm hover:bg-background"
													: "text-muted-foreground hover:text-foreground"
											}`}
											onClick={() => setActiveCredentialView("shared-links")}
											aria-pressed={activeCredentialView === "shared-links"}
										>
											<Link2 className="h-3 w-3" />
											Shared links
										</Button>
									</div>

									{activeCredentialView === "entries" ? (
										<div className="space-y-4">
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

									{selectedCredentialIds.length > 0 && (
										<div className="flex flex-wrap items-center gap-2 border-y border-border/50 py-2">
											<span className="mr-auto text-xs font-medium">
												{selectedCredentialIds.length} selected
											</span>
											<Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleCopySelectedCredentials}>
												<Copy className="h-3.5 w-3.5" />
												Copy
											</Button>
											<Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => openCredentialShareDialog(selectedCredentialIds)}>
												<Link2 className="h-3.5 w-3.5" />
												Share
											</Button>
											<Button variant="outline" size="sm" className="h-8 gap-1.5 text-destructive hover:text-destructive" onClick={confirmDeleteSelectedCredentials}>
												<Trash2 className="h-3.5 w-3.5" />
												Delete
											</Button>
										</div>
									)}

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
																<div className="flex min-w-0 flex-1 items-start gap-2">
																	<Checkbox
																		className="mt-0.5"
																		checked={selectedCredentialIds.includes(credential._id)}
																		onCheckedChange={(checked) =>
																			setCredentialSelected(credential._id, checked === true)
																		}
																		aria-label={`Select ${credential.name}`}
																	/>
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
																</div>
																<div className="flex items-center gap-1 shrink-0">
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-7 w-7 rounded-lg"
																			onClick={() => openCredentialShareDialog([credential._id])}
																			aria-label={`Share ${credential.name}`}
																			title="Share credential"
																		>
																			<Link2 className="h-3.5 w-3.5" />
																		</Button>
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-7 w-7 rounded-lg"
																			onClick={() => handleCopyCredential(credential)}
																			aria-label={`Copy ${credential.name} credential`}
																			title="Copy credential"
																		>
																			<Copy className="h-3.5 w-3.5" />
																		</Button>
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
																<div className="mt-2 flex min-w-0 items-center text-[11px] text-muted-foreground">
																	<span className="shrink-0">Secret:&nbsp;</span>
																	<span className="min-w-0 flex-1 truncate">{displayedSecret}</span>
																	{credential.secret && (
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-6 w-6 shrink-0 rounded-lg"
																			onClick={() => handleCopySecret(credential.secret!)}
																			aria-label={`Copy ${credential.name} secret`}
																			title="Copy secret"
																		>
																			<Copy className="h-3 w-3" />
																		</Button>
																	)}
															</div>
														</div>

														<div
															className="hidden md:grid items-start py-2.5 border-b border-border/50 transition-colors hover:bg-muted/50 animate-fade-in gap-3"
															style={{
																gridTemplateColumns: CREDENTIAL_GRID_COLS,
																animationDelay: `${Math.min(index, 20) * 25}ms`,
															}}
														>
															<div className="flex min-w-0 items-start gap-2 pr-2">
																<Checkbox
																	className="mt-0.5"
																	checked={selectedCredentialIds.includes(credential._id)}
																	onCheckedChange={(checked) =>
																		setCredentialSelected(credential._id, checked === true)
																	}
																	aria-label={`Select ${credential.name}`}
																/>
																<div className="min-w-0 flex-1">
																	<p className="font-medium text-sm truncate">{credential.name}</p>
																	{credential.notes && (
																		<p className="mt-1 text-xs text-muted-foreground line-clamp-2">{credential.notes}</p>
																	)}
																</div>
															</div>
															<div className="text-xs text-muted-foreground pt-1">{credential.type}</div>
															<div className="text-xs text-muted-foreground pt-1 truncate pr-2">{credential.username || "—"}</div>
															<div className="text-xs text-muted-foreground pt-1 truncate pr-2">{credential.endpoint || "—"}</div>
															<div className="flex min-w-0 items-center gap-1 overflow-hidden text-xs text-muted-foreground pt-1">
																<span className="min-w-0 flex-1 truncate">{displayedSecret}</span>
																{credential.secret && (
																	<>
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-6 w-6 shrink-0 rounded-lg"
																			onClick={() => handleCopySecret(credential.secret!)}
																			aria-label={`Copy ${credential.name} secret`}
																			title="Copy secret"
																		>
																			<Copy className="h-3 w-3" />
																		</Button>
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-6 w-6 shrink-0 rounded-lg"
																			onClick={() =>
																				setRevealedCredentials((current) => ({
																					...current,
																					[credential._id]: !isRevealed,
																				}))
																			}
																		>
																			{isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
																		</Button>
																	</>
																)}
															</div>
															<div className="flex items-center justify-end gap-1">
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-7 w-7 rounded-lg"
																	onClick={() => openCredentialShareDialog([credential._id])}
																	aria-label={`Share ${credential.name}`}
																	title="Share credential"
																>
																	<Link2 className="h-3.5 w-3.5" />
																</Button>
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-7 w-7 rounded-lg"
																			onClick={() => handleCopyCredential(credential)}
																			aria-label={`Copy ${credential.name} credential`}
																			title="Copy credential"
																		>
																			<Copy className="h-3.5 w-3.5" />
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
													</div>
												);
											})}
										</div>
									)}
										</div>
									) : (
										<CredentialSharedLinks projectId={projectId} />
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
			</main>

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
				secretVisible={credentialSecretVisible}
				onSecretVisibleChange={setCredentialSecretVisible}
			/>
			<CredentialShareDialog
				projectId={projectId}
				selectedCredentials={selectedCredentials}
				open={credentialShareDialogOpen}
				onOpenChange={(open) => {
					setCredentialShareDialogOpen(open);
					if (!open) setCredentialIdsToShare([]);
				}}
				onCreated={() => undefined}
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
			<SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
		</div>
	);
}
