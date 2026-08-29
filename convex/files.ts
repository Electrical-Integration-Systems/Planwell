import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { logAudit } from "./auditLog";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFile = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    size: v.number(),
    type: v.string(),
    kind: v.optional(v.union(v.literal("file"), v.literal("photo"))),
    projectId: v.optional(v.id("projects")),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const kind = args.kind ?? "file";
    if (kind === "photo") {
      if (!args.projectId && !args.taskId) {
        throw new Error("Photos must be attached to a project or task");
      }
      if (!args.type.startsWith("image/")) {
        throw new Error("Photos must be image files");
      }
    }

    const [project, task] = await Promise.all([
      args.projectId ? ctx.db.get(args.projectId) : Promise.resolve(null),
      args.taskId ? ctx.db.get(args.taskId) : Promise.resolve(null),
    ]);

    if (args.projectId && project === null) {
      throw new Error("Project not found");
    }
    if (args.taskId && task === null) {
      throw new Error("Task not found");
    }
    if (
      task !== null &&
      args.projectId !== undefined &&
      task.projectId !== undefined &&
      task.projectId !== args.projectId
    ) {
      throw new Error("Task belongs to a different project");
    }

    const fileId = await ctx.db.insert("files", {
      storageId: args.storageId,
      name: args.name,
      size: args.size,
      type: args.type,
      kind,
      projectId: args.projectId,
      taskId: args.taskId,
      uploadedBy: userId,
      createdAt: Date.now(),
    });
    await logAudit(ctx, {
      userId,
      action: "upload",
      entityType: "file",
      entityId: fileId,
      metadata: {
        kind,
        name: args.name,
        size: args.size,
        type: args.type,
        projectName: project?.name,
        taskTitle: task?.title,
      },
    });
    return fileId;
  },
});

export const list = query({
  args: {
    projectId: v.optional(v.id("projects")),
    taskId: v.optional(v.id("tasks")),
    kind: v.optional(v.union(v.literal("file"), v.literal("photo"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const files = await ctx.db.query("files").order("desc").collect();
    const requestedKind = args.kind ?? "file";
    const filteredFiles = files.filter((file) => {
      const fileKind = file.kind ?? "file";
      if (fileKind !== requestedKind) return false;
      if (args.projectId !== undefined && file.projectId !== args.projectId) {
        return false;
      }
      if (args.taskId !== undefined && file.taskId !== args.taskId) {
        return false;
      }
      return true;
    });

    const projectIds = [
      ...new Set(
        filteredFiles
          .map((file) => file.projectId)
          .filter((id) => id !== undefined),
      ),
    ];
    const taskIds = [
      ...new Set(
        filteredFiles.map((file) => file.taskId).filter((id) => id !== undefined),
      ),
    ];
    const projects = await Promise.all(projectIds.map((id) => ctx.db.get(id)));
    const tasks = await Promise.all(taskIds.map((id) => ctx.db.get(id)));
    const projectMap = new Map(
      projects
        .filter((project) => project !== null)
        .map((project) => [project._id, project]),
    );
    const taskMap = new Map(
      tasks.filter((task) => task !== null).map((task) => [task._id, task]),
    );

    return await Promise.all(
      filteredFiles.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId);
        const uploader = await ctx.db.get(file.uploadedBy);
        return {
          ...file,
          kind: file.kind ?? "file",
          url,
          uploaderName: uploader?.name ?? uploader?.email ?? "Unknown",
          project: file.projectId ? projectMap.get(file.projectId) ?? null : null,
          task: file.taskId ? taskMap.get(file.taskId) ?? null : null,
        };
      }),
    );
  },
});

export const listPhotos = query({
  args: {
    projectId: v.optional(v.id("projects")),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const photos = await ctx.db
      .query("files")
      .withIndex("by_kind", (q) => q.eq("kind", "photo"))
      .collect();

    let taskIdsForProject = new Set<string>();
    if (args.projectId !== undefined) {
      const projectTasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect();
      taskIdsForProject = new Set(projectTasks.map((task) => task._id));
    }

    const filteredPhotos = photos.filter((photo) => {
      if (args.taskId !== undefined) {
        return photo.taskId === args.taskId;
      }
      if (args.projectId !== undefined) {
        return (
          photo.projectId === args.projectId ||
          (photo.taskId !== undefined && taskIdsForProject.has(photo.taskId))
        );
      }
      return true;
    });

    const projectIds = [
      ...new Set(
        filteredPhotos
          .map((photo) => photo.projectId)
          .filter((id) => id !== undefined),
      ),
    ];
    const taskIds = [
      ...new Set(
        filteredPhotos
          .map((photo) => photo.taskId)
          .filter((id) => id !== undefined),
      ),
    ];

    const [projects, tasks] = await Promise.all([
      Promise.all(projectIds.map((id) => ctx.db.get(id))),
      Promise.all(taskIds.map((id) => ctx.db.get(id))),
    ]);

    const projectMap = new Map(
      projects
        .filter((project) => project !== null)
        .map((project) => [project._id, project]),
    );
    const taskMap = new Map(
      tasks.filter((task) => task !== null).map((task) => [task._id, task]),
    );

    return await Promise.all(
      filteredPhotos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        const uploader = await ctx.db.get(photo.uploadedBy);
        return {
          ...photo,
          kind: "photo" as const,
          url,
          uploaderName: uploader?.name ?? uploader?.email ?? "Unknown",
          project: photo.projectId ? projectMap.get(photo.projectId) ?? null : null,
          task: photo.taskId ? taskMap.get(photo.taskId) ?? null : null,
        };
      }),
    );
  },
});

export const updateProject = mutation({
  args: {
    fileId: v.id("files"),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const file = await ctx.db.get(args.fileId);
    if (!file) return;

    const kind = file.kind ?? "file";
    if (kind === "photo" && file.taskId !== undefined) {
      throw new Error("Task-linked photos cannot be reassigned here");
    }
    if (kind === "photo" && args.projectId === undefined) {
      throw new Error("Photos must stay attached to a project or task");
    }

    const oldProject = file.projectId ? await ctx.db.get(file.projectId) : null;
    const newProject = args.projectId ? await ctx.db.get(args.projectId) : null;

    await ctx.db.patch(args.fileId, {
      projectId: args.projectId,
    });

    await logAudit(ctx, {
      userId,
      action: "update",
      entityType: "file",
      entityId: args.fileId,
      changes: {
        projectId: {
          old: oldProject?.name ?? null,
          new: newProject?.name ?? null,
        },
      },
      metadata: { name: file.name },
    });
  },
});

export const logDownload = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const file = await ctx.db.get(args.fileId);
    if (!file) return;
    await logAudit(ctx, {
      userId,
      action: "download",
      entityType: "file",
      entityId: args.fileId,
      metadata: { name: file.name, size: file.size, type: file.type },
    });
  },
});

export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const file = await ctx.db.get(args.fileId);
    if (!file) return;
    const project = file.projectId ? await ctx.db.get(file.projectId) : null;
    if (project?.bannerPhotoId === args.fileId) {
      await ctx.db.patch(project._id, {
        bannerPhotoId: undefined,
        updatedAt: Date.now(),
      });
    }
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.fileId);
    await logAudit(ctx, {
      userId,
      action: "delete",
      entityType: "file",
      entityId: args.fileId,
      metadata: {
        kind: file.kind ?? "file",
        name: file.name,
        size: file.size,
        type: file.type,
      },
    });
  },
});
