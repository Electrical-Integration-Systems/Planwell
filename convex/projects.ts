import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { logAudit } from "./auditLog";

export const list = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const projects = await ctx.db.query("projects").collect();

    if (args.includeArchived) return projects;
    return projects.filter((p) => !p.archived);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

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
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.id);
    await ctx.db.patch(args.id, {
      archived: true,
      updatedAt: Date.now(),
    });
    await logAudit(ctx, {
      userId,
      action: "archive",
      entityType: "project",
      entityId: args.id,
      metadata: { name: project?.name ?? "Unknown" },
    });
  },
});

export const unarchive = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
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
