import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { escapeHtml } from "@/lib/escape-html";
import { fetchOgMeta } from "@/lib/og-fetch";

export const runtime = "nodejs";

const SOCIAL_CRAWLERS = [
  "twitterbot",
  "facebookexternalhit",
  "linkedinbot",
  "discordbot",
  "telegrambot",
  "slackbot",
  "whatsapp",
  "vkshare",
  "pinterest",
];

function isSocialCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return SOCIAL_CRAWLERS.some((crawler) => ua.includes(crawler));
}

// Route-specific strict CSP. The crawler-preview HTML only needs a meta
// refresh + icon link; no script execution anywhere.
const STRICT_CSP =
  "default-src 'none'; img-src https:; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none'";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return new Response("Missing NEXT_PUBLIC_CONVEX_URL", { status: 500 });
  }

  const client = new ConvexHttpClient(convexUrl);

  const referrer = req.headers.get("referer") ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;

  const result = await client.mutation(api.links.trackClick, {
    slug,
    referrer,
    userAgent,
    ip,
  });

  if (!result.ok) {
    if (result.reason === "not_found") {
      return new Response("Not found", { status: 404 });
    }
    if (result.reason === "rate_limited") {
      const retryAfter = Math.ceil((result.retryAfterMs ?? 60_000) / 1000);
      return new Response("Too many requests", {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      });
    }
    const reasonMap: Record<string, string> = {
      max_clicks: "max-clicks",
      expired: "expired",
      suspended: "suspended",
    };
    const reason = reasonMap[result.reason] ?? "expired";
    const unavailableUrl = new URL(`/unavailable?reason=${reason}`, req.url);
    return Response.redirect(unavailableUrl.toString(), 302);
  }

  const targetUrl = result.url;

  if (!isSocialCrawler(userAgent ?? null)) {
    return Response.redirect(targetUrl, 302);
  }

  // Crawler branch: extract OG tags via the SSRF-hardened fetcher and serve
  // a minimal HTML response. Every interpolated value is HTML-escaped; the
  // response is served under a strict per-route CSP that forbids scripts.
  const og = await fetchOgMeta(targetUrl);

  const ogMetaLines: string[] = [];
  let pageTitle = slug;

  if (og) {
    for (const p of og.properties) {
      const attr = p.kind === "property" ? "property" : "name";
      ogMetaLines.push(
        `  <meta ${attr}="${escapeHtml(p.key)}" content="${escapeHtml(p.value)}">`,
      );
      if (p.kind === "property" && p.key === "og:title" && pageTitle === slug) {
        pageTitle = p.value;
      }
    }
    if (og.title && pageTitle === slug) pageTitle = og.title;
  }

  const escapedTitle = escapeHtml(pageTitle);
  const escapedRefresh = escapeHtml(targetUrl);

  const body = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="robots" content="noindex,nofollow">
<meta http-equiv="refresh" content="0;url=${escapedRefresh}">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${escapedTitle}</title>
${ogMetaLines.join("\n")}
</head>
<body>
</body>
</html>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": STRICT_CSP,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
