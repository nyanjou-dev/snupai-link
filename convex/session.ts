import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function safeOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    // Try to get user from users table
    const user = await ctx.db.get(userId);
    if (!user) {
      // User record doesn't exist yet - this can happen if store hasn't been called
      // Return null so the client can call store to create it
      return null;
    }
    
    return {
      userId,
      email: user?.email ?? null,
    };
  },
});

export const authDiagnostics = query({
  args: {},
  handler: async () => {
    const convexSite = safeOrigin(process.env.CONVEX_SITE_URL);
    const customAuthSite = safeOrigin(process.env.CUSTOM_AUTH_SITE_URL);
    const configuredAuthDomain = customAuthSite ?? convexSite;

    return {
      convexSite,
      configuredAuthDomain,
      customAuthSite,
      authDomainMatchesConvexSite:
        Boolean(convexSite) && Boolean(configuredAuthDomain) && convexSite === configuredAuthDomain,
      authDomainLooksLikeConvexCloud: configuredAuthDomain?.includes(".convex.cloud") ?? false,
      hasSiteUrlOverride: Boolean(process.env.SITE_URL),
      deploymentHint: process.env.CONVEX_CLOUD_URL ?? null,
    };
  },
});
