import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { logAudit } from "./auditLog";
import { getWhitelistedUserId, requireWhitelistedUser } from "./authz";

export const list = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getWhitelistedUserId(ctx);
    if (userId === null) return [];

    const projects = await ctx.db.query("projects").collect();

    if (args.includeArchived) return projects;
    return projects.filter((p) => !p.archived);
  },
});

export const listWithStats = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getWhitelistedUserId(ctx);
    if (userId === null) return [];

    const [projects, tasks, devices, credentials, files] = await Promise.all([
      ctx.db.query("projects").collect(),
      ctx.db.query("tasks").collect(),
      ctx.db.query("projectDevices").collect(),
      ctx.db.query("projectCredentials").collect(),
      ctx.db.query("files").collect(),
    ]);

    const visibleProjects = args.includeArchived
      ? projects
      : projects.filter((project) => !project.archived);

    const taskStats = new Map<
      string,
      { total: number; active: number; archived: number }
    >();
    for (const task of tasks) {
      if (!task.projectId) continue;

      const current = taskStats.get(task.projectId) ?? {
        total: 0,
        active: 0,
        archived: 0,
      };
      current.total += 1;
      if (task.archived ?? false) {
        current.archived += 1;
      } else {
        current.active += 1;
      }
      taskStats.set(task.projectId, current);
    }

    const deviceCounts = new Map<string, number>();
    for (const device of devices) {
      deviceCounts.set(
        device.projectId,
        (deviceCounts.get(device.projectId) ?? 0) + 1,
      );
    }

    const credentialCounts = new Map<string, number>();
    for (const credential of credentials) {
      credentialCounts.set(
        credential.projectId,
        (credentialCounts.get(credential.projectId) ?? 0) + 1,
      );
    }

    const taskProjectMap = new Map<string, string>();
    for (const task of tasks) {
      if (task.projectId) {
        taskProjectMap.set(task._id, task.projectId);
      }
    }

    const fileCounts = new Map<string, number>();
    const photoCounts = new Map<string, number>();
    for (const file of files) {
      const kind = file.kind ?? "file";
      if (kind === "photo") {
        const effectiveProjectId = file.projectId ?? (file.taskId ? taskProjectMap.get(file.taskId) : undefined);
        if (!effectiveProjectId) continue;

        photoCounts.set(
          effectiveProjectId,
          (photoCounts.get(effectiveProjectId) ?? 0) + 1,
        );
        continue;
      }

      if (!file.projectId) continue;

      fileCounts.set(
        file.projectId,
        (fileCounts.get(file.projectId) ?? 0) + 1,
      );
    }
    return visibleProjects.map((project) => {
      const stats = taskStats.get(project._id) ?? {
        total: 0,
        active: 0,
        archived: 0,
      };

      return {
        ...project,
        taskCount: stats.total,
        activeTaskCount: stats.active,
        archivedTaskCount: stats.archived,
        deviceCount: deviceCounts.get(project._id) ?? 0,
        credentialCount: credentialCounts.get(project._id) ?? 0,
        fileCount: fileCounts.get(project._id) ?? 0,
        photoCount: photoCounts.get(project._id) ?? 0,
      };
    });
  },
});

export const get = query({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getWhitelistedUserId(ctx);
    if (userId === null) return null;

    const project = await ctx.db.get(args.id);
    if (project === null) return null;

    const [tasks, devices, credentials, directFiles, photos] = await Promise.all([
      ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", args.id))
        .collect(),
      ctx.db
        .query("projectDevices")
        .withIndex("by_project", (q) => q.eq("projectId", args.id))
        .collect(),
      ctx.db
        .query("projectCredentials")
        .withIndex("by_project", (q) => q.eq("projectId", args.id))
        .collect(),
      ctx.db
        .query("files")
        .withIndex("by_project", (q) => q.eq("projectId", args.id))
        .collect(),
      ctx.db
        .query("files")
        .withIndex("by_kind", (q) => q.eq("kind", "photo"))
        .collect(),
    ]);

    const taskIds = new Set(tasks.map((task) => task._id));
    const fileCount = directFiles.filter((file) => (file.kind ?? "file") !== "photo").length;
    const photoCount = photos.filter(
      (photo) =>
        photo.projectId === args.id ||
        (photo.taskId !== undefined && taskIds.has(photo.taskId)),
    ).length;

    return {
      ...project,
      taskCount: tasks.length,
      activeTaskCount: tasks.filter((task) => !(task.archived ?? false)).length,
      archivedTaskCount: tasks.filter((task) => task.archived ?? false).length,
      deviceCount: devices.length,
      credentialCount: credentials.length,
      fileCount,
      photoCount,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      location: args.location,
      archived: false,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
    await logAudit(ctx, {
      userId,
      action: "create",
      entityType: "project",
      entityId: projectId,
      metadata: { name: args.name },
    });
    return projectId;
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);

    const oldProject = await ctx.db.get(args.id);

    const { id, ...fields } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(id, patch);

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      const oldVal = (oldProject as Record<string, unknown> | null)?.[key];
      if (oldVal !== value) {
        changes[key] = { old: oldVal, new: value };
      }
    }
    if (Object.keys(changes).length > 0) {
      await logAudit(ctx, {
        userId,
        action: "update",
        entityType: "project",
        entityId: id,
        changes,
        metadata: { name: oldProject?.name ?? "Unknown" },
      });
    }
  },
});

export const archive = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const project = await ctx.db.get(args.id);
    if (project === null) throw new Error("Project not found");

    const now = Date.now();
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    const activeTasks = tasks.filter((task) => !(task.archived ?? false));

    await ctx.db.patch(args.id, {
      archived: true,
      updatedAt: now,
    });

    for (const task of activeTasks) {
      await ctx.db.patch(task._id, {
        archived: true,
        archivedAt: now,
        updatedAt: now,
      });
    }

    await logAudit(ctx, {
      userId,
      action: "archive",
      entityType: "project",
      entityId: args.id,
      metadata: {
        name: project.name,
        archivedTaskCount: activeTasks.length,
      },
    });
  },
});

export const unarchive = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const project = await ctx.db.get(args.id);
    await ctx.db.patch(args.id, {
      archived: false,
      updatedAt: Date.now(),
    });
    await logAudit(ctx, {
      userId,
      action: "unarchive",
      entityType: "project",
      entityId: args.id,
      metadata: { name: project?.name ?? "Unknown" },
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const project = await ctx.db.get(args.id);
    if (project === null) throw new Error("Project not found");
    if (!project.archived) {
      throw new Error("Only archived projects can be deleted");
    }

    const [tasks, devices, credentials, directFiles] = await Promise.all([
      ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", args.id))
        .collect(),
      ctx.db
        .query("projectDevices")
        .withIndex("by_project", (q) => q.eq("projectId", args.id))
        .collect(),
      ctx.db
        .query("projectCredentials")
        .withIndex("by_project", (q) => q.eq("projectId", args.id))
        .collect(),
      ctx.db
        .query("files")
        .withIndex("by_project", (q) => q.eq("projectId", args.id))
        .collect(),
    ]);

    for (const task of tasks) {
      const [updates, taskFiles] = await Promise.all([
        ctx.db
          .query("taskUpdates")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect(),
        ctx.db
          .query("files")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect(),
      ]);

      for (const update of updates) {
        await ctx.db.delete(update._id);
      }

      for (const file of taskFiles) {
        await ctx.storage.delete(file.storageId);
        await ctx.db.delete(file._id);
      }

      await ctx.db.delete(task._id);
    }

    for (const file of directFiles) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(file._id);
    }

    for (const device of devices) {
      await ctx.db.delete(device._id);
    }

    for (const credential of credentials) {
      await ctx.db.delete(credential._id);
    }

    await ctx.db.delete(args.id);

    await logAudit(ctx, {
      userId,
      action: "delete",
      entityType: "project",
      entityId: args.id,
      metadata: {
        name: project.name,
        deletedTaskCount: tasks.length,
        deletedDeviceCount: devices.length,
        deletedCredentialCount: credentials.length,
        deletedFileCount: directFiles.length,
      },
    });
  },
});

