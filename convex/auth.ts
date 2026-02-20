import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store: internalStore, isAuthenticated } = convexAuth({
  providers: [Password],
});

// Public mutation to ensure user record exists
// With @convex-dev/auth, user records are created automatically during sign-in
// This mutation is a no-op but exists for API compatibility
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    // User records are automatically created by the auth system during sign-in
    // This mutation exists for backward compatibility but doesn't need to do anything
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    // The user record should already exist from sign-in, but if it doesn't,
    // the auth system will handle it automatically
    return userId;
  },
});
