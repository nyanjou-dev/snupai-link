import { MutationCtx } from "./_generated/server";

/**
 * Sliding-window rate limiter backed by the `rateLimit` table.
 *
 * `kind` namespaces the bucket (e.g. "redirect:ip", "otp:email"); `key`
 * identifies the specific subject within the namespace. Consumes one slot on
 * success; does not consume on breach (so repeated queries during a breach
 * don't extend the window).
 *
 * Returns `{ allowed, remaining, retryAfterMs }` — `retryAfterMs` is a hint
 * for clients when `allowed` is false.
 */
export async function consumeRateLimit(
  ctx: MutationCtx,
  opts: { kind: string; key: string; windowMs: number; max: number },
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const { kind, key, windowMs, max } = opts;
  const now = Date.now();
  const windowStart = now - windowMs;

  const recent = await ctx.db
    .query("rateLimit")
    .withIndex("by_kind_key_time", (q) =>
      q.eq("kind", kind).eq("key", key).gt("timestamp", windowStart),
    )
    .collect();

  if (recent.length >= max) {
    const oldest = recent.reduce(
      (min, e) => (e.timestamp < min ? e.timestamp : min),
      Infinity,
    );
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, oldest + windowMs - now),
    };
  }

  await ctx.db.insert("rateLimit", {
    kind,
    key,
    timestamp: now,
  });

  // Opportunistic cleanup of this bucket's stale rows.
  const stale = await ctx.db
    .query("rateLimit")
    .withIndex("by_kind_key_time", (q) =>
      q.eq("kind", kind).eq("key", key).lt("timestamp", windowStart),
    )
    .take(50);
  for (const e of stale) {
    await ctx.db.delete(e._id);
  }

  return {
    allowed: true,
    remaining: Math.max(0, max - recent.length - 1),
    retryAfterMs: 0,
  };
}
