import { internalMutation } from "./_generated/server";

/**
 * Hard-invalidates every API key stored with the legacy DJB2 hash (prefix
 * `hash_`). Those keys are forgeable via trivial hash collisions; the only
 * safe remediation is to force users to regenerate.
 *
 * Safe to run repeatedly. Run once from the Convex dashboard after deploying
 * the SHA-256 changes and sending user communication.
 */
export const invalidateAllLegacyKeys = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let scanned = 0;
    let invalidated = 0;

    const all = await ctx.db.query("apiKeys").collect();
    for (const row of all) {
      scanned += 1;
      if (!row.key.startsWith("hash_")) continue;
      if (row.legacyInvalidatedAt != null) continue;
      await ctx.db.patch(row._id, {
        isActive: false,
        legacyInvalidatedAt: now,
      });
      invalidated += 1;
    }

    return { scanned, invalidated };
  },
});
