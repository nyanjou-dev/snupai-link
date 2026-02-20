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
    key: v.string(), // hashed API key
    name: v.string(), // user-friendly name for the key
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_key", ["key"]),
  rateLimit: defineTable({
    apiKeyId: v.id("apiKeys"),
    timestamp: v.number(), // for TTL cleanup
  }).index("by_key_and_time", ["apiKeyId", "timestamp"]),
});
