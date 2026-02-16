import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const SLUG_RE = /^[a-zA-Z0-9_-]+$/;
const AUTO_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const AUTO_MIN_LEN = 3;
const AUTO_MAX_LEN = 8;

function randomSlug(length = 6) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += AUTO_ALPHABET[Math.floor(Math.random() * AUTO_ALPHABET.length)];
  }
  return out;
}

export const create = mutation({
  args: {
    slug: v.optional(v.string()),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const customSlug = args.slug?.trim();
    let finalSlug: string;

    if (customSlug) {
      if (!SLUG_RE.test(customSlug)) {
        throw new Error("Slug can only contain letters, numbers, hyphens, and underscores");
      }

      const existing = await ctx.db
        .query("links")
        .withIndex("by_slug", (q) => q.eq("slug", customSlug))
        .first();
      if (existing) throw new Error("Slug already taken");

      finalSlug = customSlug;
    } else {
      // Auto-generate a unique slug (prefer short slugs first).
      let generated: string | null = null;

      for (let len = AUTO_MIN_LEN; len <= AUTO_MAX_LEN && !generated; len++) {
        // Try a handful per length before going longer.
        for (let i = 0; i < 12; i++) {
          const candidate = randomSlug(len);
          const existing = await ctx.db
            .query("links")
            .withIndex("by_slug", (q) => q.eq("slug", candidate))
            .first();
          if (!existing) {
            generated = candidate;
            break;
          }
        }
      }

      if (!generated) throw new Error("Could not generate unique slug. Please try again.");
      finalSlug = generated;
    }

    return await ctx.db.insert("links", {
      slug: finalSlug,
      url: args.url,
      userId,
      clickCount: 0,
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

    // Delete associated click events.
    const clickEvents = await ctx.db
      .query("clickEvents")
      .withIndex("by_link", (q) => q.eq("linkId", args.id))
      .collect();
    for (const click of clickEvents) {
      await ctx.db.delete(click._id);
    }

    // Delete associated legacy clicks while table still exists.
    const legacyClicks = await ctx.db
      .query("clicks")
      .withIndex("by_link", (q) => q.eq("linkId", args.id))
      .collect();
    for (const click of legacyClicks) {
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

    const now = Date.now();

    await ctx.db.insert("clickEvents", {
      linkId: link._id,
      createdAt: now,
      referrer: args.referrer,
      ua: args.userAgent,
    });

    const currentCount = link.clickCount ?? link.clicks ?? 0;
    await ctx.db.patch(link._id, {
      clickCount: currentCount + 1,
      lastClickedAt: now,
    });

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

    const events = await ctx.db
      .query("clickEvents")
      .withIndex("by_link", (q) => q.eq("linkId", args.linkId))
      .order("desc")
      .take(100);

    if (events.length > 0) return events;

    // Backward-compatible read fallback for data created before clickEvents existed.
    const legacy = await ctx.db
      .query("clicks")
      .withIndex("by_link", (q) => q.eq("linkId", args.linkId))
      .order("desc")
      .take(100);

    return legacy.map((c) => ({
      _id: c._id,
      _creationTime: c._creationTime,
      linkId: c.linkId,
      createdAt: c.timestamp,
      referrer: c.referrer,
      ua: c.userAgent,
    }));
  },
});

export const backfillLinkStats = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const limit = Math.min(Math.max(args.limit ?? 200, 1), 1000);
    const links = await ctx.db
      .query("links")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(limit);

    let patched = 0;

    for (const link of links) {
      const patch: {
        clickCount?: number;
        lastClickedAt?: number;
      } = {};

      if (typeof link.clickCount !== "number") {
        patch.clickCount = link.clicks ?? 0;
      }

      if (typeof link.lastClickedAt !== "number") {
        const latestEvent = await ctx.db
          .query("clickEvents")
          .withIndex("by_link", (q) => q.eq("linkId", link._id))
          .order("desc")
          .first();

        if (latestEvent) {
          patch.lastClickedAt = latestEvent.createdAt;
        } else {
          const latestLegacy = await ctx.db
            .query("clicks")
            .withIndex("by_link", (q) => q.eq("linkId", link._id))
            .order("desc")
            .first();
          if (latestLegacy) patch.lastClickedAt = latestLegacy.timestamp;
        }
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(link._id, patch);
        patched += 1;
      }
    }

    return {
      scanned: links.length,
      patched,
    };
  },
});
