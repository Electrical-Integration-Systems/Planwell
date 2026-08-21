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
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const fileId = await ctx.db.insert("files", {
      storageId: args.storageId,
      name: args.name,
      size: args.size,
      type: args.type,
      projectId: args.projectId,
      uploadedBy: userId,
      createdAt: Date.now(),
    });
    const project = args.projectId ? await ctx.db.get(args.projectId) : null;
    await logAudit(ctx, {
      userId,
      action: "upload",
      entityType: "file",
      entityId: fileId,
      metadata: {
        name: args.name,
        size: args.size,
        type: args.type,
        projectName: project?.name,
      },
    });
    return fileId;
  },
});

export const list = query({
  args: {
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const files = await ctx.db.query("files").order("desc").collect();
    const filteredFiles = args.projectId
      ? files.filter((file) => file.projectId === args.projectId)
      : files;

    const projectIds = [...new Set(filteredFiles.map((file) => file.projectId).filter((id) => id !== undefined))];
    const projects = await Promise.all(projectIds.map((id) => ctx.db.get(id)));
    const projectMap = new Map(
      projects
        .filter((project) => project !== null)
        .map((project) => [project._id, project]),
    );

    return await Promise.all(
      filteredFiles.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId);
        const uploader = await ctx.db.get(file.uploadedBy);
        return {
          ...file,
          url,
          uploaderName: uploader?.name ?? uploader?.email ?? "Unknown",
          project: file.projectId ? projectMap.get(file.projectId) ?? null : null,
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
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.fileId);
    await logAudit(ctx, {
      userId,
      action: "delete",
      entityType: "file",
      entityId: args.fileId,
      metadata: { name: file.name, size: file.size, type: file.type },
    });
  },
});
