"use node";

import {
  createHash,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
} from "node:crypto";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

type ShareStatus =
  | { available: false }
  | {
      available: true;
      mode: "timed" | "one_time";
      expiresAt?: number;
      pinHash: string;
      pinSalt: string;
    };

type PublicShareStatus =
  | { available: false }
  | {
      available: true;
      mode: "timed" | "one_time";
      expiresAt?: number;
    };

type SharedCredential = {
  name: string;
  type: string;
  username?: string;
  endpoint?: string;
  secret?: string;
  notes?: string;
};

function getPepper() {
  const pepper = process.env.CREDENTIAL_SHARE_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error("CREDENTIAL_SHARE_PEPPER must contain at least 32 characters");
  }
  return pepper;
}

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

function hashPin(pin: string, salt: string) {
  return new Promise<string>((resolve, reject) => {
    scryptCallback(`${pin}:${getPepper()}`, salt, 32, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey.toString("base64url"));
    });
  });
}

export const createShare = action({
  args: {
    projectId: v.id("projects"),
    credentialIds: v.array(v.id("projectCredentials")),
    mode: v.union(v.literal("timed"), v.literal("one_time")),
    durationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    shareId: Id<"credentialShares">;
    token: string;
    pin: string;
    expiresAt?: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    if (
      args.mode === "timed" &&
      (args.durationMinutes === undefined ||
        !Number.isInteger(args.durationMinutes) ||
        args.durationMinutes < 1 ||
        args.durationMinutes > 24 * 60)
    ) {
      throw new Error("Timed shares must expire within 24 hours");
    }
    if (args.mode === "one_time" && args.durationMinutes !== undefined) {
      throw new Error("One-time shares cannot have a duration");
    }

    const token = randomBytes(32).toString("base64url");
    const pin = randomInt(0, 100_000_000).toString().padStart(8, "0");
    const pinSalt = randomBytes(16).toString("base64url");
    const tokenHash = hashToken(token);
    const pinHash = await hashPin(pin, pinSalt);
    const expiresAt =
      args.mode === "timed"
        ? Date.now() + args.durationMinutes! * 60 * 1000
        : undefined;
    const shareId: Id<"credentialShares"> = await ctx.runMutation(
      internal.credentialShareInternal.create,
      {
        projectId: args.projectId,
        credentialIds: args.credentialIds,
        mode: args.mode,
        tokenHash,
        pinHash,
        pinSalt,
        expiresAt,
      },
    );

    return { shareId, token, pin, expiresAt };
  },
});

export const getShareStatus = action({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<
    | { status: "unavailable" }
    | {
        status: "available";
        mode: "timed" | "one_time";
        expiresAt?: number;
      }
  > => {
    if (args.token.length < 32 || args.token.length > 128) {
      return { status: "unavailable" };
    }

    const status: PublicShareStatus = await ctx.runMutation(
      internal.credentialShareInternal.recordAccess,
      { tokenHash: hashToken(args.token) },
    );
    if (!status.available) return { status: "unavailable" };

    return {
      status: "available",
      mode: status.mode,
      expiresAt: status.expiresAt,
    };
  },
});

export const redeemShare = action({
  args: { token: v.string(), pin: v.string() },
  handler: async (ctx, args): Promise<
    | { ok: false }
    | {
        ok: true;
        mode: "timed" | "one_time";
        expiresAt?: number;
        credentials: SharedCredential[];
      }
  > => {
    if (
      args.token.length < 32 ||
      args.token.length > 128 ||
      !/^\d{8}$/.test(args.pin)
    ) {
      await hashPin("00000000", "invalid-share");
      return { ok: false };
    }

    const tokenHash = hashToken(args.token);
    const status: ShareStatus = await ctx.runQuery(
      internal.credentialShareInternal.inspect,
      { tokenHash },
    );
    if (!status.available) {
      await hashPin(args.pin, "invalid-share");
      return { ok: false };
    }

    const candidatePinHash = await hashPin(args.pin, status.pinSalt);
    return await ctx.runMutation(internal.credentialShareInternal.redeem, {
      tokenHash,
      candidatePinHash,
    });
  },
});