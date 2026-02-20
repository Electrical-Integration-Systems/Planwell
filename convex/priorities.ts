import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { logAudit } from "./auditLog";
import { getWhitelistedUserId, requireWhitelistedUser } from "./authz";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getWhitelistedUserId(ctx);
    if (userId === null) return [];
    return await ctx.db.query("priorities").withIndex("by_order").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const existing = await ctx.db
      .query("priorities")
      .withIndex("by_order")
      .collect();
    const maxOrder =
      existing.length > 0 ? Math.max(...existing.map((p) => p.order)) : -1;
    const now = Date.now();
    const priorityId = await ctx.db.insert("priorities", {
      name: args.name,
      color: args.color,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });
    await logAudit(ctx, {
      userId,
      action: "create",
      entityType: "priority",
      entityId: priorityId,
      metadata: { name: args.name },
    });
    return priorityId;
  },
});

export const update = mutation({
  args: {
    id: v.id("priorities"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);

    const oldPriority = await ctx.db.get(args.id);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.color !== undefined) updates.color = args.color;
    await ctx.db.patch(args.id, updates);

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    if (args.name !== undefined && args.name !== oldPriority?.name) {
      changes["name"] = { old: oldPriority?.name, new: args.name };
    }
    if (args.color !== undefined && args.color !== oldPriority?.color) {
      changes["color"] = { old: oldPriority?.color, new: args.color };
    }
    if (Object.keys(changes).length > 0) {
      await logAudit(ctx, {
        userId,
        action: "update",
        entityType: "priority",
        entityId: args.id,
        changes,
        metadata: { name: oldPriority?.name ?? "Unknown" },
      });
    }
  },
});

export const remove = mutation({
  args: {
    id: v.id("priorities"),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_priority", (q) => q.eq("priorityId", args.id))
      .first();
    if (tasks !== null) {
      throw new Error("Cannot delete priority that is assigned to tasks");
    }
    const priority = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      userId,
      action: "delete",
      entityType: "priority",
      entityId: args.id,
      metadata: { name: priority?.name ?? "Unknown" },
    });
  },
});

export const reorder = mutation({
  args: {
    ids: v.array(v.id("priorities")),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const now = Date.now();
    for (let i = 0; i < args.ids.length; i++) {
      await ctx.db.patch(args.ids[i], { order: i, updatedAt: now });
    }
    await logAudit(ctx, {
      userId,
      action: "reorder",
      entityType: "priority",
      entityId: "all",
      metadata: { count: args.ids.length },
    });
  },
});
