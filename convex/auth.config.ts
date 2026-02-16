// Convex provides a built-in CONVEX_SITE_URL (the *.convex.site domain),
// but for auth we need the actual app origin (Vercel/custom domain).
// Set SITE_URL in Convex env vars to your deployed app URL.
const authConfig = {
  providers: [
    {
      // Must be the app origin where auth cookies are used (not CONVEX_SITE_URL).
      domain: process.env.SITE_URL ?? "http://localhost:3000",
      applicationID: "convex",
    },
  ],
};

export default authConfig;
