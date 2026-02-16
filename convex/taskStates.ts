import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db.query("taskStates").withIndex("by_order").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("taskStates")
      .withIndex("by_order")
      .collect();
    const maxOrder =
      existing.length > 0 ? Math.max(...existing.map((s) => s.order)) : -1;
    const now = Date.now();
    return await ctx.db.insert("taskStates", {
      name: args.name,
      color: args.color,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("taskStates"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.color !== undefined) updates.color = args.color;
    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: {
    id: v.id("taskStates"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_state", (q) => q.eq("stateId", args.id))
      .first();
    if (tasks !== null) {
      throw new Error("Cannot delete state that is assigned to tasks");
    }
    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: {
    ids: v.array(v.id("taskStates")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const now = Date.now();
    for (let i = 0; i < args.ids.length; i++) {
      await ctx.db.patch(args.ids[i], { order: i, updatedAt: now });
    }
  },
});
