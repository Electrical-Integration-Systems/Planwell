import { v } from "convex/values";
import { query, type MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Internal helper — called from within other mutations
export async function logAudit(
    ctx: MutationCtx,
    params: {
        userId: string;
        action: string;
        entityType: string;
        entityId: string;
        changes?: Record<string, { old: unknown; new: unknown }>;
        metadata?: Record<string, unknown>;
    },
) {
    await ctx.db.insert("auditLogs", {
        userId: params.userId as any,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes: params.changes ? JSON.stringify(params.changes) : undefined,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
        timestamp: Date.now(),
    });
}

export const list = query({
    args: {
        entityType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) return [];

        let logs;
        if (args.entityType) {
            logs = await ctx.db
                .query("auditLogs")
                .withIndex("by_entity", (q) => q.eq("entityType", args.entityType!))
                .collect();
            logs.sort((a, b) => b.timestamp - a.timestamp);
        } else {
            logs = await ctx.db.query("auditLogs").withIndex("by_timestamp").collect();
            logs.reverse();
        }

        // Denormalize user info
        const userIds = [...new Set(logs.map((l) => l.userId))];
        const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
        const userMap = new Map(
            users.filter((u) => u !== null).map((u) => [u._id, u]),
        );

        return logs.map((log) => ({
            ...log,
            user: userMap.get(log.userId) ?? null,
        }));
    },
});

export const listByEntity = query({
    args: {
        entityType: v.string(),
        entityId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) return [];

        const logs = await ctx.db
            .query("auditLogs")
            .withIndex("by_entity", (q) =>
                q.eq("entityType", args.entityType).eq("entityId", args.entityId),
            )
            .collect();
        logs.sort((a, b) => b.timestamp - a.timestamp);

        const userIds = [...new Set(logs.map((l) => l.userId))];
        const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
        const userMap = new Map(
            users.filter((u) => u !== null).map((u) => [u._id, u]),
        );

        return logs.map((log) => ({
            ...log,
            user: userMap.get(log.userId) ?? null,
        }));
    },
});
