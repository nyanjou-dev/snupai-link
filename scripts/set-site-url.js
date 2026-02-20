#!/usr/bin/env node

/**
 * Set SITE_URL in Convex based on current deployment domain.
 *
 * Usage:
 *   # For Vercel (automatic)
 *   VERCEL_URL=your-app.vercel.app CONVEX_DEPLOYMENT=prod:xxx node scripts/set-site-url.js
 *
 *   # For manual/other hosting
 *   SITE_URL=https://your-domain.com CONVEX_DEPLOYMENT=prod:xxx node scripts/set-site-url.js
 *
 * Environment variables:
 *   - VERCEL_URL: Automatically set by Vercel, includes deployment URL
 *   - SITE_URL: Manual override for your app URL
 *   - CONVEX_DEPLOYMENT: Your Convex deployment (e.g., "prod:proper-lemur-365")
 *   - VERCEL_ENV: "production", "preview", or "development" (auto-set by Vercel)
 */

const { execSync } = require("child_process");

function getSiteUrl() {
  // Vercel provides VERCEL_URL automatically (without https://)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  // Manual override
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    return siteUrl;
  }

  // Local development
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  throw new Error(
    "Could not determine SITE_URL. Set VERCEL_URL (Vercel) or SITE_URL env var."
  );
}

function setConvexEnvVar(name, value) {
  // Use --prod if this is a production deployment
  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.CONVEX_DEPLOYMENT?.startsWith("prod:");

  const deploymentFlag = isProd ? "--prod" : "";
  const command = `printf '%s' "${value}" | bunx convex env set ${name} ${deploymentFlag}`;

  try {
    execSync(command, { stdio: "inherit" });
    console.log(`✓ Set ${name}=${value}`);
  } catch (error) {
    console.error(`✗ Failed to set ${name}:`, error.message);
    throw error;
  }
}

function main() {
  try {
    const siteUrl = getSiteUrl();
    console.log(`Setting SITE_URL to: ${siteUrl}`);
    setConvexEnvVar("SITE_URL", siteUrl);
    console.log("✓ SITE_URL updated successfully");
  } catch (error) {
    console.error("✗ Failed to set SITE_URL:", error.message);
    process.exit(1);
  }
}

main();
