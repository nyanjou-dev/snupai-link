import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

function buildConnectSrc(): string {
  const https = process.env.NEXT_PUBLIC_CONVEX_URL;
  const wss = https?.replace(/^https:/, "wss:");
  const site = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  return ["'self'", https, wss, site].filter(Boolean).join(" ");
}

// Dev needs 'unsafe-eval' for Next.js HMR; production does not.
const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

const CSP = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src ${buildConnectSrc()}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/:slug.png",
        destination: "/qr/:slug",
      },
    ];
  },
  async headers() {
    return [
      {
        // Applied to every route; the /:slug route handler returns its own
        // stricter CSP header which takes precedence for that response.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
