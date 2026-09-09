import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logAudit } from "./auditLog";
import { getWhitelistedUserId, requireWhitelistedUser } from "./authz";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getWhitelistedUserId(ctx);
    if (userId === null) return [];

    const shares = await ctx.db
      .query("credentialShares")
      .withIndex("by_project", (query) =>
        query.eq("projectId", args.projectId),
      )
      .order("desc")
      .collect();
    const now = Date.now();

    return shares.map((share) => {
        const status =
          share.revokedAt !== undefined
            ? "revoked"
            : share.usedAt !== undefined
              ? "used"
              : share.expiresAt !== undefined && share.expiresAt <= now
                ? "expired"
                : "active";

        return {
          _id: share._id,
          mode: share.mode,
          expiresAt: share.expiresAt,
          usedAt: share.usedAt,
          revokedAt: share.revokedAt,
          lastAccessedAt: share.lastAccessedAt,
          createdAt: share.createdAt,
          credentialCount: share.credentialCount,
          status,
        };
      });
  },
});

export const revoke = mutation({
  args: { id: v.id("credentialShares") },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const share = await ctx.db.get(args.id);
    if (share === null) throw new Error("Share not found");

    const items = await ctx.db
      .query("credentialShareItems")
      .withIndex("by_share", (query) => query.eq("shareId", args.id))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    if (share.revokedAt === undefined) {
      await ctx.db.patch(args.id, { revokedAt: Date.now() });
      await logAudit(ctx, {
        userId,
        action: "revoke",
        entityType: "credentialShare",
        entityId: args.id,
        metadata: { projectId: share.projectId, mode: share.mode },
      });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("credentialShares") },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const share = await ctx.db.get(args.id);
    if (share === null) throw new Error("Share not found");

    const items = await ctx.db
      .query("credentialShareItems")
      .withIndex("by_share", (query) => query.eq("shareId", args.id))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(args.id);

    await logAudit(ctx, {
      userId,
      action: "delete",
      entityType: "credentialShare",
      entityId: args.id,
      metadata: {
        projectId: share.projectId,
        mode: share.mode,
        credentialCount: share.credentialCount,
        previousStatus:
          share.revokedAt !== undefined
            ? "revoked"
            : share.usedAt !== undefined
              ? "used"
              : share.expiresAt !== undefined && share.expiresAt <= Date.now()
                ? "expired"
                : "active",
      },
    });
  },
});