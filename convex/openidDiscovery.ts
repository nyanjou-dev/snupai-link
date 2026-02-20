/**
 * Custom OpenID configuration that includes token_endpoint.
 * Convex Auth's default discovery omits token_endpoint, which can cause
 * AuthProviderDiscoveryFailed when validators expect OIDC-compliant metadata.
 * This route is registered before auth routes so it takes precedence.
 */
import { httpAction } from "./_generated/server";

function getSiteUrl(): string {
  const raw =
    process.env.CUSTOM_AUTH_SITE_URL ?? process.env.CONVEX_SITE_URL;
  if (!raw) {
    throw new Error(
      "Missing CUSTOM_AUTH_SITE_URL or CONVEX_SITE_URL for OpenID discovery."
    );
  }
  return new URL(raw).origin;
}

export const openidConfiguration = httpAction(async () => {
  const siteUrl = getSiteUrl();
  const discovery = {
    issuer: siteUrl,
    jwks_uri: `${siteUrl}/.well-known/jwks.json`,
    authorization_endpoint: `${siteUrl}/oauth/authorize`,
    // OIDC requires token_endpoint; Convex Auth uses auth:signIn for token
    // exchange, but validators expect this field in the discovery document.
    token_endpoint: `${siteUrl}/api/auth/callback/convex`,
  };

  return new Response(JSON.stringify(discovery), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control":
        "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
    },
  });
});
