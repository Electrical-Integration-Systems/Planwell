import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { logAudit } from "./auditLog";
import { requireWhitelistedUser } from "./authz";

const MAX_SHARE_DURATION_MS = 24 * 60 * 60 * 1000;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;

  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return mismatch === 0;
}

function isUnavailable(share: {
  expiresAt?: number;
  usedAt?: number;
  revokedAt?: number;
  lockedUntil?: number;
}, now: number) {
  return (
    share.revokedAt !== undefined ||
    share.usedAt !== undefined ||
    (share.expiresAt !== undefined && share.expiresAt <= now) ||
    (share.lockedUntil !== undefined && share.lockedUntil > now)
  );
}

export const create = internalMutation({
  args: {
    projectId: v.id("projects"),
    credentialIds: v.array(v.id("projectCredentials")),
    mode: v.union(v.literal("timed"), v.literal("one_time")),
    tokenHash: v.string(),
    pinHash: v.string(),
    pinSalt: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const now = Date.now();
    const uniqueCredentialIds = [...new Set(args.credentialIds)];

    if (uniqueCredentialIds.length < 1 || uniqueCredentialIds.length > 20) {
      throw new Error("Select between 1 and 20 credentials");
    }
    if (
      args.mode === "timed" &&
      (args.expiresAt === undefined ||
        args.expiresAt <= now ||
        args.expiresAt > now + MAX_SHARE_DURATION_MS)
    ) {
      throw new Error("Timed shares must expire within 24 hours");
    }
    if (args.mode === "one_time" && args.expiresAt !== undefined) {
      throw new Error("One-time shares cannot have a timed expiration");
    }

    const [project, existingShare, credentials] = await Promise.all([
      ctx.db.get(args.projectId),
      ctx.db
        .query("credentialShares")
        .withIndex("by_token_hash", (query) =>
          query.eq("tokenHash", args.tokenHash),
        )
        .unique(),
      Promise.all(uniqueCredentialIds.map((id) => ctx.db.get(id))),
    ]);

    if (project === null) throw new Error("Project not found");
    if (existingShare !== null) throw new Error("Share token collision");
    if (
      credentials.some(
        (credential) =>
          credential === null || credential.projectId !== args.projectId,
      )
    ) {
      throw new Error("Invalid credential selection");
    }

    const shareId = await ctx.db.insert("credentialShares", {
      projectId: args.projectId,
      createdBy: userId,
      mode: args.mode,
      tokenHash: args.tokenHash,
      pinHash: args.pinHash,
      pinSalt: args.pinSalt,
      credentialCount: credentials.length,
      expiresAt: args.expiresAt,
      failedAttempts: 0,
      createdAt: now,
    });

    for (const [index, credential] of credentials.entries()) {
      if (credential === null) continue;
      await ctx.db.insert("credentialShareItems", {
        shareId,
        sourceCredentialId: credential._id,
        order: index,
        name: credential.name,
        type: credential.type,
        username: credential.username,
        endpoint: credential.endpoint,
        secret: credential.secret,
        notes: credential.notes,
      });
    }

    await logAudit(ctx, {
      userId,
      action: "create",
      entityType: "credentialShare",
      entityId: shareId,
      metadata: {
        projectId: args.projectId,
        mode: args.mode,
        credentialCount: credentials.length,
        expiresAt: args.expiresAt,
      },
    });

    return shareId;
  },
});

export const inspect = internalQuery({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("credentialShares")
      .withIndex("by_token_hash", (query) =>
        query.eq("tokenHash", args.tokenHash),
      )
      .unique();
    const now = Date.now();

    if (share === null || isUnavailable(share, now)) {
      return { available: false as const };
    }

    return {
      available: true as const,
      mode: share.mode,
      expiresAt: share.expiresAt,
      pinHash: share.pinHash,
      pinSalt: share.pinSalt,
    };
  },
});

export const recordAccess = internalMutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("credentialShares")
      .withIndex("by_token_hash", (query) =>
        query.eq("tokenHash", args.tokenHash),
      )
      .unique();
    const now = Date.now();

    if (share === null) return { available: false as const };

    await logAudit(ctx, {
      userId: share.createdBy,
      action: "access",
      entityType: "credentialShare",
      entityId: share._id,
      metadata: {
        projectId: share.projectId,
        mode: share.mode,
        externalRecipient: true,
      },
    });

    if (isUnavailable(share, now)) return { available: false as const };

    return {
      available: true as const,
      mode: share.mode,
      expiresAt: share.expiresAt,
    };
  },
});

export const redeem = internalMutation({
  args: {
    tokenHash: v.string(),
    candidatePinHash: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("credentialShares")
      .withIndex("by_token_hash", (query) =>
        query.eq("tokenHash", args.tokenHash),
      )
      .unique();
    const now = Date.now();

    if (share === null || isUnavailable(share, now)) {
      return { ok: false as const };
    }

    if (!constantTimeEqual(share.pinHash, args.candidatePinHash)) {
      const windowExpired =
        share.failureWindowStartedAt === undefined ||
        share.failureWindowStartedAt + FAILURE_WINDOW_MS <= now;
      const failedAttempts = windowExpired ? 1 : share.failedAttempts + 1;

      await ctx.db.patch(share._id, {
        failedAttempts: failedAttempts >= 5 ? 0 : failedAttempts,
        failureWindowStartedAt: windowExpired
          ? now
          : share.failureWindowStartedAt,
        lockedUntil:
          failedAttempts >= 5 ? now + LOCK_DURATION_MS : share.lockedUntil,
      });
      await logAudit(ctx, {
        userId: share.createdBy,
        action: "pin_failed",
        entityType: "credentialShare",
        entityId: share._id,
        metadata: {
          projectId: share.projectId,
          mode: share.mode,
          externalRecipient: true,
          locked: failedAttempts >= 5,
        },
      });
      return { ok: false as const };
    }

    const items = await ctx.db
      .query("credentialShareItems")
      .withIndex("by_share", (query) => query.eq("shareId", share._id))
      .collect();
    items.sort((left, right) => left.order - right.order);

    const credentials = items.map((item) => ({
      name: item.name,
      type: item.type,
      username: item.username,
      endpoint: item.endpoint,
      secret: item.secret,
      notes: item.notes,
    }));

    if (share.mode === "one_time") {
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
      await ctx.db.patch(share._id, {
        usedAt: now,
        failedAttempts: 0,
        failureWindowStartedAt: undefined,
        lockedUntil: undefined,
        lastAccessedAt: now,
      });
    } else {
      await ctx.db.patch(share._id, {
        failedAttempts: 0,
        failureWindowStartedAt: undefined,
        lockedUntil: undefined,
        lastAccessedAt: now,
      });
    }

    await logAudit(ctx, {
      userId: share.createdBy,
      action: "redeem",
      entityType: "credentialShare",
      entityId: share._id,
      metadata: {
        projectId: share.projectId,
        mode: share.mode,
        credentialCount: share.credentialCount,
        externalRecipient: true,
      },
    });

    return {
      ok: true as const,
      mode: share.mode,
      expiresAt: share.expiresAt,
      credentials,
    };
  },
});

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const shares = await ctx.db.query("credentialShares").collect();
    let deletedItems = 0;
    let deletedShares = 0;

    for (const share of shares) {
      const terminalAt = share.revokedAt ?? share.usedAt ?? share.expiresAt;
      const expired = share.expiresAt !== undefined && share.expiresAt <= now;

      if (expired || share.revokedAt !== undefined || share.usedAt !== undefined) {
        const items = await ctx.db
          .query("credentialShareItems")
          .withIndex("by_share", (query) => query.eq("shareId", share._id))
          .collect();
        for (const item of items) {
          await ctx.db.delete(item._id);
          deletedItems += 1;
        }
      }

      if (terminalAt !== undefined && terminalAt + RETENTION_MS <= now) {
        await ctx.db.delete(share._id);
        deletedShares += 1;
      }
    }

    return { deletedItems, deletedShares };
  },
});