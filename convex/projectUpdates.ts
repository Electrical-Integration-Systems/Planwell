import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getWhitelistedUserId, requireWhitelistedUser } from "./authz";

export const list = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getWhitelistedUserId(ctx);
    if (userId === null) return [];

    const updates = await ctx.db
      .query("projectUpdates")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
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
    projectId: v.id("projects"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const now = Date.now();

    const updateId = await ctx.db.insert("projectUpdates", {
      projectId: args.projectId,
      userId,
      body: args.body,
      createdAt: now,
    });

    await ctx.db.patch(args.projectId, { updatedAt: now });

    return updateId;
  },
});

export const remove = mutation({
  args: {
    id: v.id("projectUpdates"),
  },
  handler: async (ctx, args) => {
    await requireWhitelistedUser(ctx);
    await ctx.db.delete(args.id);
  },
});
