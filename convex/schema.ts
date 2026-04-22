import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const { users, ...restAuthTables } = authTables;

export default defineSchema({
  ...restAuthTables,
  users: defineTable({
    ...users.validator.fields,
    role: v.optional(v.string()),
    banned: v.optional(v.boolean()),
    bannedAt: v.optional(v.number()),
    apiQuotaLimit: v.optional(v.number()),
  }).index("email", ["email"]).index("phone", ["phone"]),
  links: defineTable({
    slug: v.string(),
    url: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
    clickCount: v.number(),
    expiresAt: v.optional(v.number()),
    maxClicks: v.optional(v.number()),
    lastClickedAt: v.optional(v.number()),
    // Legacy field retained temporarily for safe migration of existing docs.
    clicks: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_user", ["userId"]),
  clickEvents: defineTable({
    linkId: v.id("links"),
    createdAt: v.number(),
    referrer: v.optional(v.string()),
    ua: v.optional(v.string()),
  }).index("by_link", ["linkId"]),
  // Legacy table retained temporarily for safe migration/read fallback.
  clicks: defineTable({
    linkId: v.id("links"),
    timestamp: v.number(),
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    country: v.optional(v.string()),
  }).index("by_link", ["linkId"]),
  apiKeys: defineTable({
    userId: v.id("users"),
    // SHA-256 hex of the raw key, prefixed "sha256_". Legacy rows carry a
    // broken DJB2 hash prefixed "hash_" and will be invalidated in a follow-up.
    key: v.string(),
    // HMAC-SHA256(key, API_KEY_PEPPER) hex. Secondary index for O(1) lookup
    // without leaking an unsalted-digest oracle. Optional because legacy rows
    // do not have it.
    keyLookup: v.optional(v.string()),
    prefix: v.optional(v.string()), // visible prefix e.g. "snupi_h6Mm..."
    name: v.string(), // user-friendly name for the key
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    isActive: v.boolean(),
    // Set when the hard invalidation of legacy keys runs.
    legacyInvalidatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_key", ["key"])
    .index("by_lookup", ["keyLookup"]),
  rateLimit: defineTable({
    // Legacy per-API-key rate limiter. Kept for back-compat with existing
    // `api.ts` checkRateLimit; removed once callers migrate to kind/key.
    apiKeyId: v.optional(v.id("apiKeys")),
    // Generalized sliding-window rate limiter. `kind` namespaces the bucket
    // (e.g. "redirect:ip", "redirect:slug", "otp:email"); `key` is the per-
    // bucket identifier.
    kind: v.optional(v.string()),
    key: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_key_and_time", ["apiKeyId", "timestamp"])
    .index("by_kind_key_time", ["kind", "key", "timestamp"]),
});
