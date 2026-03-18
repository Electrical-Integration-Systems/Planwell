import { query } from "./_generated/server";
import { getWhitelistedUserId } from "./authz";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getWhitelistedUserId(ctx);
    if (userId === null) return [];
    return await ctx.db.query("users").collect();
  },
});
