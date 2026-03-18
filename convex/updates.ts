import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { logAudit } from "./auditLog";
import { getWhitelistedUserId, requireWhitelistedUser } from "./authz";

export const list = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await getWhitelistedUserId(ctx);
    if (userId === null) return [];
    const updates = await ctx.db
      .query("taskUpdates")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const userIds = [...new Set(updates.map((u) => u.userId))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(
      users.filter((u) => u !== null).map((u) => [u._id, u]),
    );

    return updates.map((update) => ({
      ...update,
      user: userMap.get(update.userId) ?? null,
    }));
  },
});

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);

    const task = await ctx.db.get(args.taskId);
    const updateId = await ctx.db.insert("taskUpdates", {
      taskId: args.taskId,
      userId,
      body: args.body,
      createdAt: Date.now(),
    });

    await logAudit(ctx, {
      userId,
      action: "add_update",
      entityType: "task",
      entityId: args.taskId,
      metadata: { name: task?.title ?? "Unknown", body: args.body },
    });

    return updateId;
  },
});

export const remove = mutation({
  args: {
    id: v.id("taskUpdates"),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);

    const update = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);

    if (update) {
      const task = await ctx.db.get(update.taskId);
      await logAudit(ctx, {
        userId,
        action: "remove_update",
        entityType: "task",
        entityId: update.taskId,
        metadata: { name: task?.title ?? "Unknown", body: update.body },
      });
    }
  },
});
