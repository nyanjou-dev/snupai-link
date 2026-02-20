import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Simple hash function for API keys (must match apiKeys.ts)
function hashApiKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

// Rate limit configuration (burst)
const RATE_LIMIT_WINDOW = 5000; // 5 seconds
const RATE_LIMIT_MAX_REQUESTS = 10;

// Link creation quota (per user via API)
const QUOTA_WINDOW_MS = 5 * 60 * 60 * 1000; // 5 hours
const QUOTA_MAX_LINKS = 20;

async function checkRateLimit(
  ctx: any,
  apiKeyId: any
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Count requests in the current window
  const recentRequests = await ctx.db
    .query("rateLimit")
    .withIndex("by_key_and_time", (q: any) =>
      q
        .eq("apiKeyId", apiKeyId)
        .gt("timestamp", windowStart)
    )
    .collect();

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  // Record this request
  await ctx.db.insert("rateLimit", {
    apiKeyId,
    timestamp: now,
  });

  // Clean up old entries
  for (const entry of recentRequests) {
    if (entry.timestamp < windowStart) {
      await ctx.db.delete(entry._id);
    }
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - recentRequests.length - 1,
  };
}

export const createLink = mutation({
  args: {
    apiKey: v.string(),
    slug: v.string(),
    url: v.string(),
    expiresAt: v.optional(v.number()),
    maxClicks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const hashedKey = hashApiKey(args.apiKey);

    // Find API key
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", hashedKey))
      .collect();

    const key = keys[0];
    if (!key || !key.isActive) {
      throw new Error("Invalid API key");
    }

    // Check if user is banned
    const user = await ctx.db.get(key.userId);
    if (!user || user.banned) {
      throw new Error("Account suspended");
    }

    // Check rate limit (burst)
    const rateLimit = await checkRateLimit(ctx, key._id);
    if (!rateLimit.allowed) {
      throw new Error(
        `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW / 1000} seconds.`
      );
    }

    // Check link creation quota (20 per 5 hours per user)
    const now = Date.now();
    const quotaWindowStart = now - QUOTA_WINDOW_MS;
    const recentLinks = await ctx.db
      .query("links")
      .withIndex("by_user", (q) => q.eq("userId", key.userId))
      .filter((q) => q.gt(q.field("createdAt"), quotaWindowStart))
      .collect();

    if (recentLinks.length >= QUOTA_MAX_LINKS) {
      throw new Error(
        `Quota exceeded. Maximum ${QUOTA_MAX_LINKS} links per ${QUOTA_WINDOW_MS / (60 * 60 * 1000)} hours via API.`
      );
    }

    // Update last used timestamp
    await ctx.db.patch(key._id, {
      lastUsedAt: now,
    });

    // Validate slug is unique
    const existing = await ctx.db
      .query("links")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error("Slug already exists");
    }

    // Validate URL
    try {
      new URL(args.url);
    } catch {
      throw new Error("Invalid URL");
    }

    // Create the link
    const linkId = await ctx.db.insert("links", {
      slug: args.slug,
      url: args.url,
      userId: key.userId,
      createdAt: now,
      clickCount: 0,
      expiresAt: args.expiresAt,
      maxClicks: args.maxClicks,
    });

    return {
      id: linkId,
      slug: args.slug,
      url: args.url,
      shortUrl: `${process.env.SITE_URL || "https://snupai.link"}/${args.slug}`,
      rateLimitRemaining: rateLimit.remaining,
    };
  },
});

export const validateKey = query({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const hashedKey = hashApiKey(args.apiKey);

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", hashedKey))
      .collect();

    const key = keys[0];
    if (!key || !key.isActive) {
      return { valid: false };
    }

    return {
      valid: true,
      name: key.name,
    };
  },
});

export const quotaStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const now = Date.now();
    const windowStart = now - QUOTA_WINDOW_MS;

    const recentLinks = await ctx.db
      .query("links")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gt(q.field("createdAt"), windowStart))
      .collect();

    const used = recentLinks.length;
    // The earliest link's createdAt + window = when one slot frees up
    const oldestInWindow = recentLinks.reduce(
      (min, l) => (l.createdAt < min ? l.createdAt : min),
      Infinity,
    );
    const resetsAt = used > 0 ? oldestInWindow + QUOTA_WINDOW_MS : null;

    return {
      used,
      limit: QUOTA_MAX_LINKS,
      remaining: Math.max(0, QUOTA_MAX_LINKS - used),
      resetsAt,
      windowMs: QUOTA_WINDOW_MS,
    };
  },
});
