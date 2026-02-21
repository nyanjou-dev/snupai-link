import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const SLUG_RE = /^[a-zA-Z0-9_-]+$/;
const AUTO_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const AUTO_MIN_LEN = 3;
const AUTO_MAX_LEN = 8;
const DIRECT_UNKNOWN_REFERRER = "direct/unknown";
const MIN_MAX_CLICKS = 1;
const MAX_MAX_CLICKS = 1_000_000;
const MIN_EXPIRY_MS_FROM_NOW = 60_000; // 1 minute
const MAX_EXPIRY_MS_FROM_NOW = 5 * 365 * 24 * 60 * 60 * 1000; // 5 years
const QUOTA_WINDOW_MS = 5 * 60 * 60 * 1000; // 5 hours
const QUOTA_DEFAULT_LINKS = 25;

function randomSlug(length = 6) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += AUTO_ALPHABET[Math.floor(Math.random() * AUTO_ALPHABET.length)];
  }
  return out;
}

function normalizeReferrerDomain(referrer?: string) {
  if (!referrer) return DIRECT_UNKNOWN_REFERRER;

  const value = referrer.trim();
  if (!value) return DIRECT_UNKNOWN_REFERRER;

  const candidates = [value, `https://${value}`];

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      if (host) return host;
    } catch {
      // Continue trying fallbacks.
    }
  }

  return DIRECT_UNKNOWN_REFERRER;
}

export const create = mutation({
  args: {
    slug: v.optional(v.string()),
    url: v.string(),
    expiresAt: v.optional(v.number()),
    maxClicks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (user?.banned) throw new Error("Account suspended");

    // Enforce link creation quota
    const quotaLimit = user?.apiQuotaLimit ?? QUOTA_DEFAULT_LINKS;
    const quotaWindowStart = Date.now() - QUOTA_WINDOW_MS;
    const recentLinks = await ctx.db
      .query("links")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gt(q.field("createdAt"), quotaWindowStart))
      .collect();
    if (recentLinks.length >= quotaLimit) {
      throw new Error(`Quota exceeded. You can create up to ${quotaLimit} links per 5 hours.`);
    }

    let normalizedUrl: string;
    try {
      const parsedUrl = new URL(args.url.trim());
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("URL must start with http:// or https://");
      }
      normalizedUrl = parsedUrl.toString();
    } catch {
      throw new Error("Please enter a valid destination URL");
    }

    const now = Date.now();

    if (typeof args.maxClicks === "number") {
      if (!Number.isInteger(args.maxClicks)) {
        throw new Error("Click limit must be a whole number");
      }
      if (args.maxClicks < MIN_MAX_CLICKS || args.maxClicks > MAX_MAX_CLICKS) {
        throw new Error(`Click limit must be between ${MIN_MAX_CLICKS} and ${MAX_MAX_CLICKS.toLocaleString()}`);
      }
    }

    if (typeof args.expiresAt === "number") {
      if (!Number.isFinite(args.expiresAt)) {
        throw new Error("Invalid expiry date");
      }
      if (args.expiresAt < now + MIN_EXPIRY_MS_FROM_NOW) {
        throw new Error("Expiry must be at least 1 minute in the future");
      }
      if (args.expiresAt > now + MAX_EXPIRY_MS_FROM_NOW) {
        throw new Error("Expiry date is too far in the future");
      }
    }

    const customSlug = args.slug?.trim();
    let finalSlug: string;

    if (customSlug) {
      if (customSlug.length < 2 || customSlug.length > 64) {
        throw new Error("Slug must be between 2 and 64 characters");
      }

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
      url: normalizedUrl,
      userId,
      clickCount: 0,
      createdAt: now,
      expiresAt: args.expiresAt,
      maxClicks: args.maxClicks,
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

    const user = await ctx.db.get(userId);
    if (user?.banned) throw new Error("Account suspended");

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
    if (!link) return { ok: false as const, reason: "not_found" as const };

    const owner = await ctx.db.get(link.userId);
    if (owner?.banned) return { ok: false as const, reason: "suspended" as const };

    const now = Date.now();
    const currentCount = link.clickCount ?? link.clicks ?? 0;

    if (typeof link.expiresAt === "number" && now > link.expiresAt) {
      return { ok: false as const, reason: "expired" as const };
    }

    if (typeof link.maxClicks === "number" && currentCount >= link.maxClicks) {
      return { ok: false as const, reason: "max_clicks" as const };
    }

    const referrerDomain = normalizeReferrerDomain(args.referrer);

    try {
      await ctx.db.insert("clickEvents", {
        linkId: link._id,
        createdAt: now,
        referrer: referrerDomain,
        ua: args.userAgent,
      });
    } catch {
      // Best-effort analytics capture; redirect flow should still work.
    }

    await ctx.db.patch(link._id, {
      clickCount: currentCount + 1,
      lastClickedAt: now,
    });

    return { ok: true as const, url: link.url };
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

export const topReferrersForLink = query({
  args: {
    linkId: v.id("links"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const link = await ctx.db.get(args.linkId);
    if (!link || link.userId !== userId) return [];

    const limit = Math.min(Math.max(args.limit ?? 5, 1), 20);
    const counts = new Map<string, number>();

    const events = await ctx.db
      .query("clickEvents")
      .withIndex("by_link", (q) => q.eq("linkId", args.linkId))
      .collect();

    if (events.length > 0) {
      for (const event of events) {
        const domain = normalizeReferrerDomain(event.referrer);
        counts.set(domain, (counts.get(domain) ?? 0) + 1);
      }
    } else {
      const legacy = await ctx.db
        .query("clicks")
        .withIndex("by_link", (q) => q.eq("linkId", args.linkId))
        .collect();

      for (const event of legacy) {
        const domain = normalizeReferrerDomain(event.referrer);
        counts.set(domain, (counts.get(domain) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([domain, count]) => ({ domain, count }));
  },
});

export const analyticsOverview = query({
  args: {
    topLimit: v.optional(v.number()),
    recentLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        topLinks: [],
        recentClicks: [],
      };
    }

    const topLimit = Math.min(Math.max(args.topLimit ?? 5, 1), 20);
    const recentLimit = Math.min(Math.max(args.recentLimit ?? 20, 1), 100);

    const links = await ctx.db
      .query("links")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const topLinks = [...links]
      .sort((a, b) => (b.clickCount ?? b.clicks ?? 0) - (a.clickCount ?? a.clicks ?? 0))
      .slice(0, topLimit)
      .map((link) => ({
        _id: link._id,
        slug: link.slug,
        url: link.url,
        clickCount: link.clickCount ?? link.clicks ?? 0,
        lastClickedAt: link.lastClickedAt,
      }));

    const recentFromEvents = await Promise.all(
      links.map(async (link) => {
        const events = await ctx.db
          .query("clickEvents")
          .withIndex("by_link", (q) => q.eq("linkId", link._id))
          .order("desc")
          .take(recentLimit);

        if (events.length > 0) {
          return events.map((event) => ({
            _id: event._id,
            linkId: link._id,
            slug: link.slug,
            createdAt: event.createdAt,
            referrer: event.referrer,
            ua: event.ua,
          }));
        }

        const legacy = await ctx.db
          .query("clicks")
          .withIndex("by_link", (q) => q.eq("linkId", link._id))
          .order("desc")
          .take(recentLimit);

        return legacy.map((event) => ({
          _id: event._id,
          linkId: link._id,
          slug: link.slug,
          createdAt: event.timestamp,
          referrer: event.referrer,
          ua: event.userAgent,
        }));
      })
    );

    const recentClicks = recentFromEvents
      .flat()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, recentLimit);

    return {
      topLinks,
      recentClicks,
    };
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
