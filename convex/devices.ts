import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logAudit } from "./auditLog";
import { getWhitelistedUserId, requireWhitelistedUser } from "./authz";

export const listByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getWhitelistedUserId(ctx);
    if (userId === null) return [];

    const devices = await ctx.db
      .query("projectDevices")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    devices.sort((a, b) => b.updatedAt - a.updatedAt);
    return devices;
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    deviceType: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const now = Date.now();
    const deviceId = await ctx.db.insert("projectDevices", {
      ...args,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    await logAudit(ctx, {
      userId,
      action: "create",
      entityType: "device",
      entityId: deviceId,
      metadata: { name: args.name },
    });

    return deviceId;
  },
});

export const update = mutation({
  args: {
    id: v.id("projectDevices"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    deviceType: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const device = await ctx.db.get(args.id);
    if (device === null) throw new Error("Device not found");

    const { id, ...fields } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue;

      patch[key] = value;
      const oldVal = (device as Record<string, unknown>)[key];
      if (oldVal !== value) {
        changes[key] = { old: oldVal, new: value };
      }
    }

    await ctx.db.patch(id, patch);

    if (Object.keys(changes).length > 0) {
      await logAudit(ctx, {
        userId,
        action: "update",
        entityType: "device",
        entityId: id,
        changes,
        metadata: { name: device.name },
      });
    }
  },
});

export const remove = mutation({
  args: {
    id: v.id("projectDevices"),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const device = await ctx.db.get(args.id);
    if (device === null) throw new Error("Device not found");

    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      userId,
      action: "delete",
      entityType: "device",
      entityId: args.id,
      metadata: { name: device.name },
    });
  },
});