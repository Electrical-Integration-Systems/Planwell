import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db.query("filterPresets").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    filters: v.string(),
    sortKeys: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("filterPresets", {
      name: args.name,
      filters: args.filters,
      sortKeys: args.sortKeys,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("filterPresets"),
    name: v.optional(v.string()),
    filters: v.optional(v.string()),
    sortKeys: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const { id, ...fields } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: {
    id: v.id("filterPresets"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});
