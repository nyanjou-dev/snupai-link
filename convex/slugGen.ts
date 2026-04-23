import { QueryCtx } from "./_generated/server";

const AUTO_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const AUTO_MIN_LEN = 3;
const AUTO_MAX_LEN = 8;

export function randomSlug(length = 6) {
  // Uniform pick from a 31-char alphabet using CSPRNG bytes + rejection sampling.
  // Math.random leaks PRNG state; for slugs that gate private links this matters.
  const alphabetLen = AUTO_ALPHABET.length;
  const threshold = Math.floor(256 / alphabetLen) * alphabetLen; // 248 for len=31
  let out = "";
  while (out.length < length) {
    const buf = new Uint8Array((length - out.length) * 2);
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && out.length < length; i++) {
      if (buf[i] < threshold) out += AUTO_ALPHABET[buf[i] % alphabetLen];
    }
  }
  return out;
}

export async function generateUniqueSlug(ctx: QueryCtx): Promise<string> {
  for (let len = AUTO_MIN_LEN; len <= AUTO_MAX_LEN; len++) {
    for (let i = 0; i < 12; i++) {
      const candidate = randomSlug(len);
      const existing = await ctx.db
        .query("links")
        .withIndex("by_slug", (q) => q.eq("slug", candidate))
        .first();
      if (!existing) return candidate;
    }
  }
  throw new Error("Could not generate unique slug. Please try again.");
}
