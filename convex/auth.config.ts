/**
 * Convex Auth provider domain must point at the Convex site URL so auth HTTP routes
 * and session cookies are issued from the same origin as Convex auth endpoints.
 *
 * Root cause fixed here:
 * - We previously preferred SITE_URL (app origin) and fell back to localhost.
 * - In production this can point auth to the wrong origin, causing sign-in to never
 *   complete because the session handshake runs against a different host.
 */
function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, "");
  }
}

const providerDomain = normalizeOrigin(
  process.env.CONVEX_SITE_URL ??
    process.env.CONVEX_AUTH_SITE_URL ??
    process.env.SITE_URL ??
    "http://localhost:3000",
);

const authConfig = {
  providers: [
    {
      domain: providerDomain,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
