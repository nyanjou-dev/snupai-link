import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    slug: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check slug uniqueness
    const existing = await ctx.db
      .query("links")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error("Slug already taken");

    // Validate slug
    if (!/^[a-zA-Z0-9_-]+$/.test(args.slug)) {
      throw new Error("Slug can only contain letters, numbers, hyphens, and underscores");
    }

    return await ctx.db.insert("links", {
      slug: args.slug,
      url: args.url,
      userId,
      clicks: 0,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("links")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const remove = mutation({
  args: { id: v.id("links") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const link = await ctx.db.get(args.id);
    if (!link || link.userId !== userId) throw new Error("Not found");
    
    // Delete associated clicks
    const clicks = await ctx.db
      .query("clicks")
      .withIndex("by_link", (q) => q.eq("linkId", args.id))
      .collect();
    for (const click of clicks) {
      await ctx.db.delete(click._id);
    }
    
    await ctx.db.delete(args.id);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("links")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const trackClick = mutation({
  args: {
    slug: v.string(),
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("links")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!link) return null;

    await ctx.db.insert("clicks", {
      linkId: link._id,
      timestamp: Date.now(),
      referrer: args.referrer,
      userAgent: args.userAgent,
    });

    await ctx.db.patch(link._id, { clicks: link.clicks + 1 });
    return link.url;
  },
});

export const getClicks = query({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const link = await ctx.db.get(args.linkId);
    if (!link || link.userId !== userId) return [];
    return await ctx.db
      .query("clicks")
      .withIndex("by_link", (q) => q.eq("linkId", args.linkId))
      .order("desc")
      .take(100);
  },
});
