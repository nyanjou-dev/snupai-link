import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
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
});
