import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { logAudit } from "./auditLog";
import { getWhitelistedUserId, requireWhitelistedUser } from "./authz";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getWhitelistedUserId(ctx);
    if (userId === null) return [];
    return await ctx.db.query("tags").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const now = Date.now();
    const tagId = await ctx.db.insert("tags", {
      name: args.name,
      color: args.color,
      createdAt: now,
      updatedAt: now,
    });
    await logAudit(ctx, {
      userId,
      action: "create",
      entityType: "tag",
      entityId: tagId,
      metadata: { name: args.name },
    });
    return tagId;
  },
});

export const update = mutation({
  args: {
    id: v.id("tags"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);

    const oldTag = await ctx.db.get(args.id);

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.color !== undefined) patch.color = args.color;
    await ctx.db.patch(args.id, patch);

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    if (args.name !== undefined && args.name !== oldTag?.name) {
      changes["name"] = { old: oldTag?.name, new: args.name };
    }
    if (args.color !== undefined && args.color !== oldTag?.color) {
      changes["color"] = { old: oldTag?.color, new: args.color };
    }
    if (Object.keys(changes).length > 0) {
      await logAudit(ctx, {
        userId,
        action: "update",
        entityType: "tag",
        entityId: args.id,
        changes,
        metadata: { name: oldTag?.name ?? "Unknown" },
      });
    }
  },
});

export const remove = mutation({
  args: {
    id: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);

    const tag = await ctx.db.get(args.id);

    // Remove tag from all tasks that reference it
    const allTasks = await ctx.db.query("tasks").collect();
    for (const task of allTasks) {
      if (task.tagIds.includes(args.id)) {
        await ctx.db.patch(task._id, {
          tagIds: task.tagIds.filter((id) => id !== args.id),
          updatedAt: Date.now(),
        });
      }
    }
    await ctx.db.delete(args.id);

    await logAudit(ctx, {
      userId,
      action: "delete",
      entityType: "tag",
      entityId: args.id,
      metadata: { name: tag?.name ?? "Unknown" },
    });
  },
});
