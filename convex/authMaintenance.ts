import { mutation, internalMutation } from "./_generated/server";

/**
 * Repairs broken/stale auth rows (can happen after provider/config changes).
 * Safe to run repeatedly.
 */
export const cleanupInvalidAuthReferences = mutation({
  args: {},
  handler: async (ctx) => {
    let removedAccounts = 0;
    let removedSessions = 0;
    let removedRefreshTokens = 0;
    let removedVerificationCodes = 0;

    // 1) Remove authAccounts whose user no longer exists
    const accounts = await ctx.db.query("authAccounts").collect();
    const removedAccountIds = new Set<string>();

    for (const account of accounts) {
      const user = await ctx.db.get(account.userId);
      if (!user) {
        await ctx.db.delete(account._id);
        removedAccountIds.add(account._id as string);
        removedAccounts++;
      }
    }

    // 2) Remove verification codes pointing to removed/non-existent accounts
    const codes = await ctx.db.query("authVerificationCodes").collect();
    for (const code of codes) {
      const accountExists = removedAccountIds.has(code.accountId as string)
        ? false
        : !!(await ctx.db.get(code.accountId));
      if (!accountExists) {
        await ctx.db.delete(code._id);
        removedVerificationCodes++;
      }
    }

    // 3) Remove sessions whose user no longer exists
    const sessions = await ctx.db.query("authSessions").collect();
    const removedSessionIds = new Set<string>();
    for (const session of sessions) {
      const user = await ctx.db.get(session.userId);
      if (!user) {
        await ctx.db.delete(session._id);
        removedSessionIds.add(session._id as string);
        removedSessions++;
      }
    }

    // 4) Remove refresh tokens whose session no longer exists
    const refreshTokens = await ctx.db.query("authRefreshTokens").collect();
    for (const token of refreshTokens) {
      const sessionExists = removedSessionIds.has(token.sessionId as string)
        ? false
        : !!(await ctx.db.get(token.sessionId));
      if (!sessionExists) {
        await ctx.db.delete(token._id);
        removedRefreshTokens++;
      }
    }

    return {
      removedAccounts,
      removedVerificationCodes,
      removedSessions,
      removedRefreshTokens,
    };
  },
});

/**
 * One-time migration: marks all existing password accounts as email-verified.
 * Run once via Convex dashboard after deploying email verification.
 */
export const grandfatherExistingAccounts = mutation({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("authAccounts").collect();
    let patched = 0;

    for (const account of accounts) {
      if (account.provider !== "password") continue;
      if (account.emailVerified) continue;

      await ctx.db.patch(account._id, {
        emailVerified: account.providerAccountId,
      });
      patched++;
    }

    return { patched };
  },
});
