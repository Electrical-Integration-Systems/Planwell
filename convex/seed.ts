import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    // Seed task states if empty
    const existingStates = await ctx.db.query("taskStates").first();
    if (existingStates === null) {
      const now = Date.now();
      const defaultStates = [
        { name: "To Do", color: "#6b7280" },
        { name: "In Progress", color: "#3b82f6" },
        { name: "Done", color: "#22c55e" },
        { name: "Stuck", color: "#ef4444" },
      ];
      for (let i = 0; i < defaultStates.length; i++) {
        await ctx.db.insert("taskStates", {
          name: defaultStates[i].name,
          color: defaultStates[i].color,
          order: i,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Seed priorities if empty
    const existingPriorities = await ctx.db.query("priorities").first();
    if (existingPriorities === null) {
      const now = Date.now();
      const defaultPriorities = [
        { name: "Urgent", color: "#ef4444" },
        { name: "High", color: "#f97316" },
        { name: "Medium", color: "#eab308" },
        { name: "Low", color: "#6b7280" },
      ];
      for (let i = 0; i < defaultPriorities.length; i++) {
        await ctx.db.insert("priorities", {
          name: defaultPriorities[i].name,
          color: defaultPriorities[i].color,
          order: i,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});
