import type { AuthConfig } from "convex/server";

function resolveAuthDomain() {
  const raw = process.env.CUSTOM_AUTH_SITE_URL ?? process.env.CONVEX_SITE_URL;
  if (!raw) {
    throw new Error("Missing CUSTOM_AUTH_SITE_URL or CONVEX_SITE_URL for Convex auth provider domain.");
  }

  const domain = new URL(raw).origin;

  if (domain.includes(".convex.cloud")) {
    throw new Error(
      `Invalid Convex auth provider domain: ${domain}. Use CONVEX_SITE_URL (or CUSTOM_AUTH_SITE_URL), not NEXT_PUBLIC_CONVEX_URL (*.convex.cloud).`,
    );
  }

  return domain;
}

const authConfig = {
  providers: [
    {
      domain: resolveAuthDomain(),
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;

export default authConfig;
