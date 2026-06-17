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
  "discord",
  "telegrambot",
  "slackbot",
  "embedly",
  "whatsapp",
  "vkshare",
  "pinterest",
  "mastodon",
  "bluesky",
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

function unavailableRedirectUrl(req: NextRequest, reason: string): URL {
  return new URL(`/unavailable?reason=${reason}`, req.url);
}

// Renders the OG-tag HTML for social-crawler previews. No click is counted
// for crawler hits, so bots cannot exhaust a capped link.
async function serveCrawlerPreview(
  req: NextRequest,
  slug: string,
): Promise<Response> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return new Response("Missing NEXT_PUBLIC_CONVEX_URL", { status: 500 });
  }

  const client = new ConvexHttpClient(convexUrl);
  // Use the long-standing public slug lookup instead of the newer
  // getRedirectTarget query so the frontend can be deployed before/without a
  // matching Convex function rollout. Crawler requests still avoid the click
  // mutation, so previews do not burn capped links or pollute analytics.
  const link = await client.query(api.links.getBySlug, { slug });

  if (!link) {
    return new Response("Not found", { status: 404 });
  }

  const now = Date.now();
  if (typeof link.expiresAt === "number" && now > link.expiresAt) {
    return Response.redirect(unavailableRedirectUrl(req, "expired").toString(), 302);
  }
  if (
    typeof link.maxClicks === "number" &&
    (link.clickCount ?? 0) >= link.maxClicks
  ) {
    return Response.redirect(unavailableRedirectUrl(req, "max-clicks").toString(), 302);
  }

  // Extract OG tags via the SSRF-hardened fetcher and serve a minimal HTML
  // response. Every interpolated value is HTML-escaped; the response is
  // served under a strict per-route CSP that forbids scripts.
  const og = await fetchOgMeta(link.url);

  // If the target blocks server-side metadata scraping (Amazon often does from
  // cloud hosts), do not return an empty HTML page. Let the crawler follow the
  // real target URL instead. Discord follows redirects for embeds, and this is
  // closer to the behavior of posting the long link directly than suppressing
  // the embed with a blank preview response.
  if (!og) {
    return Response.redirect(link.url, 302);
  }

  const ogMetaLines: string[] = [];
  let pageTitle = slug;

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

  const escapedTitle = escapeHtml(pageTitle);
  const escapedRefresh = escapeHtml(link.url);

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const userAgent = req.headers.get("user-agent");

  // Bots get the OG preview without consuming a click. Humans get the normal
  // redirect + click-tracking path.
  if (isSocialCrawler(userAgent)) {
    return serveCrawlerPreview(req, slug);
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return new Response("Missing NEXT_PUBLIC_CONVEX_URL", { status: 500 });
  }

  const client = new ConvexHttpClient(convexUrl);

  const referrer = req.headers.get("referer") ?? undefined;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;

  const result = await client.mutation(api.links.trackClick, {
    slug,
    referrer,
    userAgent: userAgent ?? undefined,
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
    return Response.redirect(unavailableRedirectUrl(req, reason).toString(), 302);
  }

  return Response.redirect(result.url, 302);
}
