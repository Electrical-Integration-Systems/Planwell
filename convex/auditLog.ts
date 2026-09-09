import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, type MutationCtx } from "./_generated/server";
import { getWhitelistedUserId } from "./authz";

// Internal helper — called from within other mutations
export async function logAudit(
  ctx: MutationCtx,
  params: {
    userId: Id<"users">;
    action: string;
    entityType: string;
    entityId: string;
    changes?: Record<string, { old: unknown; new: unknown }>;
    metadata?: Record<string, unknown>;
  },
) {
  await ctx.db.insert("auditLogs", {
    userId: params.userId,
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
    const userId = await getWhitelistedUserId(ctx);
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
    const userId = await getWhitelistedUserId(ctx);
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

export const listForProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getWhitelistedUserId(ctx);
    if (userId === null) return [];

    // Collect all entities that belong to this project
    const [tasks, files, devices, credentials] = await Promise.all([
      ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect(),
      ctx.db
        .query("files")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect(),
      ctx.db
        .query("projectDevices")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect(),
      ctx.db
        .query("projectCredentials")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect(),
    ]);

    // Also collect files attached to tasks (e.g. task photos)
    const taskFileArrays = await Promise.all(
      tasks.map((t) =>
        ctx.db
          .query("files")
          .withIndex("by_task", (q) => q.eq("taskId", t._id))
          .collect(),
      ),
    );
    const taskFiles = taskFileArrays.flat();

    // Fetch audit logs for each entity type in parallel
    const [projectLogs, credentialShareLogs, ...rest] = await Promise.all([
      ctx.db
        .query("auditLogs")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", "project").eq("entityId", args.projectId),
        )
        .collect(),
      ctx.db
        .query("auditLogs")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", "credentialShare"),
        )
        .collect(),
      ...tasks.map((t) =>
        ctx.db
          .query("auditLogs")
          .withIndex("by_entity", (q) =>
            q.eq("entityType", "task").eq("entityId", t._id),
          )
          .collect(),
      ),
      ...[...files, ...taskFiles].map((f) =>
        ctx.db
          .query("auditLogs")
          .withIndex("by_entity", (q) =>
            q.eq("entityType", "file").eq("entityId", f._id),
          )
          .collect(),
      ),
      ...devices.map((d) =>
        ctx.db
          .query("auditLogs")
          .withIndex("by_entity", (q) =>
            q.eq("entityType", "device").eq("entityId", d._id),
          )
          .collect(),
      ),
      ...credentials.map((c) =>
        ctx.db
          .query("auditLogs")
          .withIndex("by_entity", (q) =>
            q.eq("entityType", "credential").eq("entityId", c._id),
          )
          .collect(),
      ),
    ]);

    const projectCredentialShareLogs = credentialShareLogs.filter((log) => {
      if (log.metadata === undefined) return false;
      const metadata = JSON.parse(log.metadata) as { projectId?: string };
      return metadata.projectId === args.projectId;
    });

    // Merge, deduplicate, and sort oldest-first
    const seen = new Set<string>();
    const allLogs = [projectLogs, projectCredentialShareLogs, ...rest]
      .flat()
      .filter((log) => {
        if (seen.has(log._id)) return false;
        seen.add(log._id);
        return true;
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    const allUserIds = [...new Set(allLogs.map((l) => l.userId))];
    const allUsers = await Promise.all(allUserIds.map((id) => ctx.db.get(id)));
    const allUserMap = new Map(
      allUsers.filter((u) => u !== null).map((u) => [u._id, u]),
    );

    return allLogs.map((log) => ({
      ...log,
      user: allUserMap.get(log.userId) ?? null,
    }));
  },
});
