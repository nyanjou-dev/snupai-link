import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { consumeRateLimit } from "./rateLimitLib";

/**
 * Per-email rate limit for any OTP send (sign-up verification, password
 * reset, resend). Called by the client before `signIn` when an OTP email
 * would be sent. Throws with a clear message when throttled; the UI surfaces
 * that message as the usual sign-in error.
 *
 * Two windows are enforced so a single check covers both burst and flood:
 *   - 60s / 1 send per (email, purpose) — back-to-back resend cooldown.
 *   - 24h / 10 sends per (email, purpose) — daily cap.
 */
export const requestOtp = mutation({
  args: {
    email: v.string(),
    purpose: v.union(v.literal("verify"), v.literal("reset")),
  },
  handler: async (ctx, args) => {
    const key = `${args.email.trim().toLowerCase()}:${args.purpose}`;

    const burst = await consumeRateLimit(ctx, {
      kind: "otp:burst",
      key,
      windowMs: 60_000,
      max: 1,
    });
    if (!burst.allowed) {
      const seconds = Math.ceil(burst.retryAfterMs / 1000);
      throw new Error(
        `Please wait ${seconds}s before requesting another code.`,
      );
    }

    const daily = await consumeRateLimit(ctx, {
      kind: "otp:daily",
      key,
      windowMs: 24 * 60 * 60 * 1000,
      max: 10,
    });
    if (!daily.allowed) {
      throw new Error(
        "Too many codes requested for this email today. Please try again tomorrow.",
      );
    }

    return { ok: true as const };
  },
});
