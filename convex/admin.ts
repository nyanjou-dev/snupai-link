import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || user.role !== "admin") throw new Error("Not authorized");
  return { userId, user };
}

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const user = await ctx.db.get(userId);
    return user?.role === "admin";
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    const results = await Promise.all(
      users.map(async (user) => {
        const links = await ctx.db
          .query("links")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        return {
          _id: user._id,
          email: user.email ?? null,
          role: user.role ?? null,
          banned: user.banned ?? false,
          bannedAt: user.bannedAt ?? null,
          emailVerified: user.emailVerificationTime != null,
          linkCount: links.length,
          createdAt: user._creationTime,
        };
      }),
    );
    return results;
  },
});

export const listAllLinks = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);

    const links = await ctx.db.query("links").order("desc").take(limit);
    const results = await Promise.all(
      links.map(async (link) => {
        const owner = await ctx.db.get(link.userId);
        return {
          _id: link._id,
          slug: link.slug,
          url: link.url,
          userId: link.userId,
          ownerEmail: owner?.email ?? "unknown",
          clickCount: link.clickCount ?? link.clicks ?? 0,
          createdAt: link.createdAt,
        };
      }),
    );
    return results;
  },
});

export const banUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAdmin(ctx);
    if (args.userId === adminId) throw new Error("Cannot ban yourself");
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");
    if (target.role === "admin") throw new Error("Cannot ban another admin");

    await ctx.db.patch(args.userId, {
      banned: true,
      bannedAt: Date.now(),
    });

    // Invalidate sessions but keep links (redirects are disabled while banned)
    await deleteSessionsForUser(ctx, args.userId);
  },
});

export const unbanUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");

    await ctx.db.patch(args.userId, { banned: false });
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAdmin(ctx);
    if (args.userId === adminId) throw new Error("Cannot delete yourself");
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");
    if (target.role === "admin") throw new Error("Cannot delete another admin");

    await deleteUserData(ctx, args.userId, true);
  },
});

export const deleteLink = mutation({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const link = await ctx.db.get(args.linkId);
    if (!link) throw new Error("Link not found");

    const clickEvents = await ctx.db
      .query("clickEvents")
      .withIndex("by_link", (q) => q.eq("linkId", args.linkId))
      .collect();
    for (const click of clickEvents) {
      await ctx.db.delete(click._id);
    }

    const legacyClicks = await ctx.db
      .query("clicks")
      .withIndex("by_link", (q) => q.eq("linkId", args.linkId))
      .collect();
    for (const click of legacyClicks) {
      await ctx.db.delete(click._id);
    }

    await ctx.db.delete(args.linkId);
  },
});

export const forceLogoutUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");

    await deleteSessionsForUser(ctx, args.userId);
  },
});

async function deleteSessionsForUser(ctx: MutationCtx, userId: Id<"users">) {
  const sessions = await ctx.db
    .query("authSessions")
    .filter((q) => q.eq(q.field("userId"), userId))
    .collect();

  for (const session of sessions) {
    const refreshTokens = await ctx.db
      .query("authRefreshTokens")
      .filter((q) => q.eq(q.field("sessionId"), session._id))
      .collect();
    for (const token of refreshTokens) {
      await ctx.db.delete(token._id);
    }
    await ctx.db.delete(session._id);
  }
}

async function deleteUserData(ctx: MutationCtx, userId: Id<"users">, deleteAccount: boolean) {
  // Delete all links + click events
  const links = await ctx.db
    .query("links")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const link of links) {
    const clickEvents = await ctx.db
      .query("clickEvents")
      .withIndex("by_link", (q) => q.eq("linkId", link._id))
      .collect();
    for (const click of clickEvents) {
      await ctx.db.delete(click._id);
    }

    const legacyClicks = await ctx.db
      .query("clicks")
      .withIndex("by_link", (q) => q.eq("linkId", link._id))
      .collect();
    for (const click of legacyClicks) {
      await ctx.db.delete(click._id);
    }

    await ctx.db.delete(link._id);
  }

  // Delete API keys + rate limits
  const apiKeys = await ctx.db
    .query("apiKeys")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const key of apiKeys) {
    const rateLimits = await ctx.db
      .query("rateLimit")
      .withIndex("by_key_and_time", (q) => q.eq("apiKeyId", key._id))
      .collect();
    for (const rl of rateLimits) {
      await ctx.db.delete(rl._id);
    }
    await ctx.db.delete(key._id);
  }

  // Delete sessions + refresh tokens
  await deleteSessionsForUser(ctx, userId);

  if (deleteAccount) {
    // Delete auth accounts
    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const account of accounts) {
      // Delete verification codes for this account
      const codes = await ctx.db
        .query("authVerificationCodes")
        .filter((q) => q.eq(q.field("accountId"), account._id))
        .collect();
      for (const code of codes) {
        await ctx.db.delete(code._id);
      }
      await ctx.db.delete(account._id);
    }

    // Delete user document
    await ctx.db.delete(userId);
  }
}
