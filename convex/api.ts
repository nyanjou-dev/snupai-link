import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import {
  constantTimeEqual,
  keyLookupHex,
  legacyDjb2,
  sha256Hex,
} from "./apiKeyHash";

// Rate limit configuration (burst)
const RATE_LIMIT_WINDOW = 5000; // 5 seconds
const RATE_LIMIT_MAX_REQUESTS = 10;

// Link creation quota (per user via API)
const QUOTA_WINDOW_MS = 5 * 60 * 60 * 1000; // 5 hours
const QUOTA_DEFAULT_LINKS = 25;

async function checkRateLimit(
  ctx: MutationCtx,
  apiKeyId: Id<"apiKeys">,
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  const recentRequests = await ctx.db
    .query("rateLimit")
    .withIndex("by_key_and_time", (q) =>
      q.eq("apiKeyId", apiKeyId).gt("timestamp", windowStart),
    )
    .collect();

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  await ctx.db.insert("rateLimit", {
    apiKeyId,
    timestamp: now,
  });

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

async function findApiKey(
  ctx: MutationCtx,
  rawKey: string,
): Promise<Doc<"apiKeys"> | null> {
  // Preferred path: peppered HMAC lookup + SHA-256 constant-time compare.
  try {
    const lookup = await keyLookupHex(rawKey);
    const candidate = await ctx.db
      .query("apiKeys")
      .withIndex("by_lookup", (q) => q.eq("keyLookup", lookup))
      .first();
    if (candidate) {
      const stored = candidate.key;
      const fresh = await sha256Hex(rawKey);
      if (constantTimeEqual(stored, fresh)) return candidate;
    }
  } catch {
    // API_KEY_PEPPER may be missing during first deploy; fall through to
    // legacy path so deploy order isn't strict.
  }

  // Legacy fallback: DJB2 hash for pre-migration rows. Insecure by design;
  // removed once invalidateAllLegacyKeys has run.
  const legacyHash = legacyDjb2(rawKey);
  const legacy = await ctx.db
    .query("apiKeys")
    .withIndex("by_key", (q) => q.eq("key", legacyHash))
    .first();
  if (legacy && legacy.key.startsWith("hash_")) return legacy;

  return null;
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
    const key = await findApiKey(ctx, args.apiKey);
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
