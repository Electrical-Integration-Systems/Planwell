import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logAudit } from "./auditLog";
import { getWhitelistedUserId, requireWhitelistedUser } from "./authz";

function maskSecret(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return "—";
  return "••••••";
}

export const listByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getWhitelistedUserId(ctx);
    if (userId === null) return [];

    const credentials = await ctx.db
      .query("projectCredentials")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    credentials.sort((a, b) => b.updatedAt - a.updatedAt);
    return credentials;
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    type: v.string(),
    username: v.optional(v.string()),
    secret: v.optional(v.string()),
    endpoint: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const now = Date.now();
    const credentialId = await ctx.db.insert("projectCredentials", {
      ...args,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    await logAudit(ctx, {
      userId,
      action: "create",
      entityType: "credential",
      entityId: credentialId,
      metadata: { name: args.name, type: args.type },
    });

    return credentialId;
  },
});

export const update = mutation({
  args: {
    id: v.id("projectCredentials"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    username: v.optional(v.string()),
    secret: v.optional(v.string()),
    endpoint: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const credential = await ctx.db.get(args.id);
    if (credential === null) throw new Error("Credential not found");

    const { id, ...fields } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue;

      patch[key] = value;
      const oldVal = (credential as Record<string, unknown>)[key];
      if (oldVal === value) continue;

      if (key === "secret") {
        changes[key] = {
          old: maskSecret(oldVal),
          new: maskSecret(value),
        };
      } else {
        changes[key] = { old: oldVal, new: value };
      }
    }

    await ctx.db.patch(id, patch);

    if (Object.keys(changes).length > 0) {
      await logAudit(ctx, {
        userId,
        action: "update",
        entityType: "credential",
        entityId: id,
        changes,
        metadata: { name: credential.name, type: credential.type },
      });
    }
  },
});

export const remove = mutation({
  args: {
    id: v.id("projectCredentials"),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const credential = await ctx.db.get(args.id);
    if (credential === null) throw new Error("Credential not found");

    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      userId,
      action: "delete",
      entityType: "credential",
      entityId: args.id,
      metadata: { name: credential.name, type: credential.type },
    });
  },
});