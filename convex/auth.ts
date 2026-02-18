import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { logAudit } from "./auditLog";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      // Only log for brand-new users (not returning users)
      if (!existingUserId) {
        const user = await ctx.db.get(userId);
        await logAudit(ctx, {
          userId: userId as string,
          action: "signup",
          entityType: "user",
          entityId: userId as string,
          metadata: { name: user?.name ?? user?.email ?? "New user" },
        });
      }
    },
  },
});
