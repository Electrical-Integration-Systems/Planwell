import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { logAudit } from "./auditLog";
import { isEmailWhitelisted } from "./authz";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId, profile }) {
      const user = await ctx.db.get(userId);
      const email =
        typeof user?.email === "string"
          ? user.email
          : typeof profile.email === "string"
            ? profile.email
            : undefined;

      if (!isEmailWhitelisted(email)) {
        throw new Error("This account is not allowed to access this workspace.");
      }

      // Only log for brand-new users (not returning users)
      if (!existingUserId) {
        await logAudit(ctx, {
          userId,
          action: "signup",
          entityType: "user",
          entityId: userId,
          metadata: { name: user?.name ?? user?.email ?? "New user" },
        });
      }
    },
  },
});
