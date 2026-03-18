import { getAuthUserId } from "@convex-dev/auth/server";
import { query, type MutationCtx, type QueryCtx } from "./_generated/server";

type AuthzCtx = QueryCtx | MutationCtx;

function normalizeEmail(email: string | undefined): string | null {
  if (typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function parseAllowedEmails(rawValue: string | undefined): Set<string> {
  if (typeof rawValue !== "string") return new Set();
  return new Set(
    rawValue
      .split(/[,\n]/)
      .map((email) => normalizeEmail(email))
      .filter((email): email is string => email !== null),
  );
}

function getAllowedEmails(): Set<string> {
  const allowedEmails = parseAllowedEmails(process.env.ALLOWED_EMAILS);
  if (allowedEmails.size === 0) {
    throw new Error("ALLOWED_EMAILS is not configured");
  }
  return allowedEmails;
}

export function isEmailWhitelisted(email: string | undefined): boolean {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail === null) return false;
  return getAllowedEmails().has(normalizedEmail);
}

export async function getWhitelistedUserId(ctx: AuthzCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;

  const user = await ctx.db.get(userId);
  if (!isEmailWhitelisted(user?.email)) return null;

  return userId;
}

export async function requireWhitelistedUser(ctx: AuthzCtx) {
  const userId = await getWhitelistedUserId(ctx);
  if (userId !== null) return userId;

  const authUserId = await getAuthUserId(ctx);
  if (authUserId === null) throw new Error("Not authenticated");
  throw new Error("Not authorized");
}

export const isCurrentUserAllowed = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getWhitelistedUserId(ctx);
    return userId !== null;
  },
});

export const getCurrentUserEmail = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const user = await ctx.db.get(userId);
    return user?.email ?? null;
  },
});
