import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { keyLookupHex, sha256Hex } from "./apiKeyHash";

// Generate a random API key using a CSPRNG (Web Crypto).
// 24 random bytes → 32-char base64url body → "snupi_" + body (38 chars total).
// 192 bits of entropy; Math.random is not acceptable for key material.
function generateApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const body = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `snupi_${body}`;
}

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const trimmedName = args.name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Key name is required");
    }
    if (trimmedName.length > 64) {
      throw new Error("Key name must be 64 characters or fewer");
    }

    const apiKey = generateApiKey();
    const hashedKey = await sha256Hex(apiKey);
    const keyLookup = await keyLookupHex(apiKey);

    const prefix = apiKey.slice(0, 12) + "...";
    const keyId = await ctx.db.insert("apiKeys", {
      userId: userId,
      key: hashedKey,
      keyLookup,
      prefix,
      name: trimmedName,
      createdAt: Date.now(),
      isActive: true,
    });

    // Return the actual API key (only time it's shown)
    return {
      id: keyId,
      key: apiKey,
      name: trimmedName,
      createdAt: Date.now(),
    };
  },
});

export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Return without the actual key
    return keys.map((key) => ({
      id: key._id,
      name: key.name,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      isActive: key.isActive,
      legacyInvalidatedAt: key.legacyInvalidatedAt ?? null,
      identifier: key.prefix ?? `${key.key.slice(0, 12)}...`,
    }));
  },
});

export const remove = mutation({
  args: {
    id: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const key = await ctx.db.get(args.id);
    if (!key) {
      throw new Error("API key not found");
    }

    if (key.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.id);
  },
});
