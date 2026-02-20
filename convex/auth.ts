import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { mutation } from "./_generated/server";

export const { auth, signIn, signOut, store: internalStore, isAuthenticated } = convexAuth({
  providers: [Password],
});

// Expose store as a public mutation so it can be called from the client
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    return await internalStore(ctx);
  },
});
