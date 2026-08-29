"use client";

import { useConvexAuth, useQuery } from "convex/react";
import {
	CheckCircle2,
	FolderKanban,
	ListTodo,
	Mail,
	ShieldCheck,
	UserRound,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { PlanwellLogoMark } from "@/components/PlanwellLogoMark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(timestamp: number) {
	return new Intl.DateTimeFormat("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(timestamp));
}

function getInitials(name?: string | null, email?: string | null) {
	const source = name?.trim() || email?.trim() || "?";
	const parts = source.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
	}
	return source.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const viewer = useQuery(api.users.viewer);
	const projects = useQuery(api.projects.listWithStats, { includeArchived: true });
	const activeTasks = useQuery(api.tasks.list, { archived: false, limit: 500 });
	const archivedTasks = useQuery(api.tasks.list, { archived: true, limit: 500 });

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="flex flex-col items-center gap-3 animate-fade-in">
					<PlanwellLogoMark size="sm" />
					<p className="text-xs tracking-wide text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) return null;

	if (viewer === undefined) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="flex flex-col items-center gap-3 animate-fade-in">
					<PlanwellLogoMark size="sm" />
					<p className="text-xs tracking-wide text-muted-foreground">
						Loading profile...
					</p>
				</div>
			</div>
		);
	}

	if (viewer === null) {
		return (
			<div className="mx-auto flex w-full max-w-[960px] px-3 pb-6 pt-4 sm:px-6 lg:px-8">
				<Card className="w-full border-border/50 shadow-warm-sm">
					<CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
							<UserRound className="h-6 w-6" />
						</div>
						<div>
							<p className="text-sm font-medium">Profile unavailable</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Your account details could not be loaded.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	const displayName = viewer.name?.trim() || "Workspace user";
	const email = viewer.email?.trim() || "No email available";
	const avatarSrc =
		"image" in viewer && typeof viewer.image === "string" && viewer.image.length > 0
			? viewer.image
			: undefined;
	const createdProjectsCount =
		projects?.filter((project) => project.createdBy === viewer._id).length ?? 0;
	const assignedActiveTasksCount =
		activeTasks?.tasks.filter((task) => task.assignees.includes(viewer._id)).length ?? 0;
	const assignedArchivedTasksCount =
		archivedTasks?.tasks.filter((task) => task.assignees.includes(viewer._id)).length ?? 0;

	return (
		<div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-3 pb-6 pt-4 sm:px-6 lg:px-8">
			<Card className="overflow-hidden border-border/50 shadow-warm-sm">
				<div className="h-28 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.35),transparent_38%),linear-gradient(135deg,rgba(29,78,216,0.16),rgba(14,165,233,0.06)_55%,transparent)]" />
				<CardContent className="relative px-5 pb-6 pt-0 sm:px-6">
					<div className="-mt-10 flex flex-col gap-5 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
						<div className="flex items-end gap-4">
							<Avatar size="lg" className="h-20 w-20 border-4 border-card shadow-warm-sm">
								{avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
								<AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">
									{getInitials(viewer.name, viewer.email)}
								</AvatarFallback>
							</Avatar>
							<div className="pb-1">
								<div className="flex flex-wrap items-center gap-2">
									<h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
										{displayName}
									</h1>
									<Badge variant="secondary" className="gap-1.5 rounded-full px-2.5">
										<CheckCircle2 className="h-3.5 w-3.5 text-primary" />
										Active account
									</Badge>
								</div>
								<div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
									<span className="flex items-center gap-1.5">
										<Mail className="h-4 w-4" />
										{email}
									</span>
									<span className="flex items-center gap-1.5">
										<ShieldCheck className="h-4 w-4" />
										Joined {formatDate(viewer._creationTime)}
									</span>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-2 sm:min-w-[280px] sm:grid-cols-3">
							<div className="rounded-xl border border-border/50 bg-muted/40 px-3 py-3">
								<p className="text-[11px] uppercase tracking-wider text-muted-foreground">
									Projects
								</p>
								<p className="mt-1 text-xl font-semibold">{createdProjectsCount}</p>
							</div>
							<div className="rounded-xl border border-border/50 bg-muted/40 px-3 py-3">
								<p className="text-[11px] uppercase tracking-wider text-muted-foreground">
									Active tasks
								</p>
								<p className="mt-1 text-xl font-semibold">{assignedActiveTasksCount}</p>
							</div>
							<div className="rounded-xl border border-border/50 bg-muted/40 px-3 py-3 col-span-2 sm:col-span-1">
								<p className="text-[11px] uppercase tracking-wider text-muted-foreground">
									Archived tasks
								</p>
								<p className="mt-1 text-xl font-semibold">{assignedArchivedTasksCount}</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
				<Card className="border-border/50 shadow-warm-sm">
					<CardHeader className="pb-3">
						<CardTitle className="font-serif text-xl tracking-tight">
							Account details
						</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div className="rounded-xl border border-border/50 bg-muted/35 p-4">
							<p className="text-[11px] uppercase tracking-wider text-muted-foreground">
								Full name
							</p>
							<p className="mt-1 text-sm font-medium">{displayName}</p>
						</div>
						<div className="rounded-xl border border-border/50 bg-muted/35 p-4">
							<p className="text-[11px] uppercase tracking-wider text-muted-foreground">
								Email
							</p>
							<p className="mt-1 text-sm font-medium break-all">{email}</p>
						</div>
						<div className="rounded-xl border border-border/50 bg-muted/35 p-4">
							<p className="text-[11px] uppercase tracking-wider text-muted-foreground">
								User ID
							</p>
							<p className="mt-1 text-sm font-medium break-all">{viewer._id}</p>
						</div>
						<div className="rounded-xl border border-border/50 bg-muted/35 p-4">
							<p className="text-[11px] uppercase tracking-wider text-muted-foreground">
								Workspace access
							</p>
							<p className="mt-1 text-sm font-medium">Whitelisted Google account</p>
						</div>
					</CardContent>
				</Card>

				<Card className="border-border/50 shadow-warm-sm">
					<CardHeader className="pb-3">
						<CardTitle className="font-serif text-xl tracking-tight">
							Activity snapshot
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/35 p-4">
							<div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
								<FolderKanban className="h-4 w-4" />
							</div>
							<div>
								<p className="text-sm font-medium">Project ownership</p>
								<p className="mt-1 text-xs text-muted-foreground">
									You created {createdProjectsCount} {createdProjectsCount === 1 ? "project" : "projects"} in this workspace.
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/35 p-4">
							<div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
								<ListTodo className="h-4 w-4" />
							</div>
							<div>
								<p className="text-sm font-medium">Assigned work</p>
								<p className="mt-1 text-xs text-muted-foreground">
									You are currently assigned to {assignedActiveTasksCount} active {assignedActiveTasksCount === 1 ? "task" : "tasks"} and {assignedArchivedTasksCount} archived {assignedArchivedTasksCount === 1 ? "task" : "tasks"}.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
