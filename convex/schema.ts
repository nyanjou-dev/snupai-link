import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  links: defineTable({
    slug: v.string(),
    url: v.string(),
    userId: v.id("users"),
    clicks: v.number(),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_user", ["userId"]),
  clicks: defineTable({
    linkId: v.id("links"),
    timestamp: v.number(),
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    country: v.optional(v.string()),
  }).index("by_link", ["linkId"]),
});
