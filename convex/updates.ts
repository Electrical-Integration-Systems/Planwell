import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
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
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    return await ctx.db.insert("taskUpdates", {
      taskId: args.taskId,
      userId,
      body: args.body,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("taskUpdates"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});
