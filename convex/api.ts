import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

// Rate limit configuration
const RATE_LIMIT_WINDOW = 5000; // 5 seconds
const RATE_LIMIT_MAX_REQUESTS = 10;

async function checkRateLimit(
  ctx: any,
  apiKeyId: any
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Count requests in the current window
  const recentRequests = await ctx.db
    .query("rateLimit")
    .withIndex("by_key_and_time", (q) =>
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

    // Check rate limit
    const rateLimit = await checkRateLimit(ctx, key._id);
    if (!rateLimit.allowed) {
      throw new Error(
        `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW / 1000} seconds.`
      );
    }

    // Update last used timestamp
    await ctx.db.patch(key._id, {
      lastUsedAt: Date.now(),
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
      createdAt: Date.now(),
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
