// Convex provides a built-in CONVEX_SITE_URL (the *.convex.site domain),
// but for auth we need the actual app origin (Vercel/custom domain).
// Set SITE_URL in Convex env vars to your deployed app URL.
export default {
  providers: [
    {
      domain: process.env.SITE_URL ?? process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
