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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const fileId = await ctx.db.insert("files", {
      storageId: args.storageId,
      name: args.name,
      size: args.size,
      type: args.type,
      uploadedBy: userId,
      createdAt: Date.now(),
    });
    await logAudit(ctx, {
      userId,
      action: "upload",
      entityType: "file",
      entityId: fileId,
      metadata: { name: args.name, size: args.size, type: args.type },
    });
    return fileId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const files = await ctx.db.query("files").order("desc").collect();
    return await Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId);
        const uploader = await ctx.db.get(file.uploadedBy);
        return {
          ...file,
          url,
          uploaderName: uploader?.name ?? uploader?.email ?? "Unknown",
        };
      }),
    );
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
