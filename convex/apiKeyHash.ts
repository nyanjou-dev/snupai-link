// Shared API-key hashing helpers. Used by both `apiKeys.ts` (create) and
// `api.ts` (authenticate).
//
// - `sha256Hex` hashes the raw key for storage and verification compare.
// - `keyLookupHex` computes HMAC-SHA256(key, API_KEY_PEPPER) for indexed O(1)
//   lookup without exposing an unsalted-digest oracle on the public surface.
// - `constantTimeEqual` compares two equal-length strings without early exit.

const encoder = new TextEncoder();

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return `sha256_${bufferToHex(digest)}`;
}

function getPepper(): string {
  const pepper = process.env.API_KEY_PEPPER;
  if (!pepper) {
    throw new Error(
      "API_KEY_PEPPER env var is required. Set it with `bunx convex env set API_KEY_PEPPER <32-byte-base64>`.",
    );
  }
  return pepper;
}

export async function keyLookupHex(input: string): Promise<string> {
  const pepper = getPepper();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
  return bufferToHex(sig);
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
