import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";
import { constantTimeEqual, keyLookupHex, sha256Hex } from "./apiKeyHash";
import { consumeRateLimit } from "./rateLimitLib";
import { generateUniqueSlug } from "./slugGen";

// Rate limit configuration (burst)
const RATE_LIMIT_WINDOW = 5000; // 5 seconds
const RATE_LIMIT_MAX_REQUESTS = 10;

// Link creation quota (per user via API)
const QUOTA_WINDOW_MS = 5 * 60 * 60 * 1000; // 5 hours
const QUOTA_DEFAULT_LINKS = 25;

async function findApiKey(
  ctx: MutationCtx,
  rawKey: string,
): Promise<Doc<"apiKeys"> | null> {
  const lookup = await keyLookupHex(rawKey);
  const candidate = await ctx.db
    .query("apiKeys")
    .withIndex("by_lookup", (q) => q.eq("keyLookup", lookup))
    .first();
  if (!candidate) return null;
  const fresh = await sha256Hex(rawKey);
  return constantTimeEqual(candidate.key, fresh) ? candidate : null;
}

export const createLink = mutation({
  args: {
    apiKey: v.string(),
    slug: v.optional(v.string()),
    url: v.string(),
    expiresAt: v.optional(v.number()),
    maxClicks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const key = await findApiKey(ctx, args.apiKey);
    if (!key || !key.isActive) {
      throw new Error("Invalid API key");
    }

    // Check if user is banned
    const user = await ctx.db.get(key.userId);
    if (!user || user.banned) {
      throw new Error("Account suspended");
    }

    // Per-API-key burst rate limit via the generic rate limiter.
    const rateLimit = await consumeRateLimit(ctx, {
      kind: "api:burst",
      key: key._id as string,
      windowMs: RATE_LIMIT_WINDOW,
      max: RATE_LIMIT_MAX_REQUESTS,
    });
    if (!rateLimit.allowed) {
      throw new Error(
        `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW / 1000} seconds.`,
      );
    }

    // Check link creation quota per user
    const userQuotaLimit = user.apiQuotaLimit ?? QUOTA_DEFAULT_LINKS;
    const now = Date.now();
    const quotaWindowStart = now - QUOTA_WINDOW_MS;
    const recentLinks = await ctx.db
      .query("links")
      .withIndex("by_user", (q) => q.eq("userId", key.userId))
      .filter((q) => q.gt(q.field("createdAt"), quotaWindowStart))
      .collect();

    if (recentLinks.length >= userQuotaLimit) {
      throw new Error(
        `Quota exceeded. Maximum ${userQuotaLimit} links per ${QUOTA_WINDOW_MS / (60 * 60 * 1000)} hours via API.`
      );
    }

    // Update last used timestamp
    await ctx.db.patch(key._id, {
      lastUsedAt: now,
    });

    // Validate URL
    try {
      new URL(args.url);
    } catch {
      throw new Error("Invalid URL");
    }

    const trimmed = args.slug?.trim();
    let finalSlug: string;
    if (trimmed) {
      const existing = await ctx.db
        .query("links")
        .withIndex("by_slug", (q) => q.eq("slug", trimmed))
        .unique();
      if (existing) throw new Error("Slug already exists");
      finalSlug = trimmed;
    } else {
      finalSlug = await generateUniqueSlug(ctx);
    }

    // Create the link
    const linkId = await ctx.db.insert("links", {
      slug: finalSlug,
      url: args.url,
      userId: key.userId,
      createdAt: now,
      clickCount: 0,
      expiresAt: args.expiresAt,
      maxClicks: args.maxClicks,
    });

    return {
      id: linkId,
      slug: finalSlug,
      url: args.url,
      shortUrl: `${process.env.SITE_URL || "https://snupai.link"}/${finalSlug}`,
      rateLimitRemaining: rateLimit.remaining,
    };
  },
});

export const quotaStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    const limit = user?.apiQuotaLimit ?? QUOTA_DEFAULT_LINKS;

    const now = Date.now();
    const windowStart = now - QUOTA_WINDOW_MS;

    const recentLinks = await ctx.db
      .query("links")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gt(q.field("createdAt"), windowStart))
      .collect();

    const used = recentLinks.length;
    const oldestInWindow = recentLinks.reduce(
      (min, l) => (l.createdAt < min ? l.createdAt : min),
      Infinity,
    );
    const resetsAt = used > 0 ? oldestInWindow + QUOTA_WINDOW_MS : null;

    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetsAt,
      windowMs: QUOTA_WINDOW_MS,
    };
  },
});
