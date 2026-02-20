import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

export const runtime = "edge";

// List of social media crawler user agents
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return new Response("Missing NEXT_PUBLIC_CONVEX_URL", { status: 500 });
  }

  const client = new ConvexHttpClient(convexUrl);

  const referrer = req.headers.get("referer") ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  const result = await client.mutation(api.links.trackClick, {
    slug,
    referrer,
    userAgent,
  });

  if (!result.ok) {
    if (result.reason === "not_found") {
      return new Response("Not found", { status: 404 });
    }

    const reason = result.reason === "max_clicks" ? "max-clicks" : "expired";
    const unavailableUrl = new URL(`/unavailable?reason=${reason}`, req.url);
    return Response.redirect(unavailableUrl.toString(), 302);
  }

  const targetUrl = result.url;
  const siteUrl = process.env.SITE_URL || "https://snupai.link";
  const fullUrl = `${siteUrl}/${slug}`;

  // If it's a social media crawler, return HTML with OG tags
  if (isSocialCrawler(userAgent)) {
    let ogMetaTags = "";
    let pageTitle = slug;

    try {
      const targetResponse = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; snupai-link-bot/1.0)",
        },
      });
      if (targetResponse.ok) {
        const html = await targetResponse.text();

        // Extract Open Graph meta tags
        const ogProperties = [
          "og:title",
          "og:description",
          "og:image",
          "og:url",
          "og:type",
          "og:site_name",
          "og:video",
          "og:video:url",
          "og:video:secure_url",
          "og:video:type",
          "og:video:width",
          "og:video:height",
          "twitter:card",
          "twitter:site",
          "twitter:title",
          "twitter:description",
          "twitter:image",
          "twitter:player",
          "twitter:player:width",
          "twitter:player:height",
        ];

        for (const prop of ogProperties) {
          const regex = new RegExp(
            `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
            "i"
          );
          const match = html.match(regex);
          if (match && match[1]) {
            ogMetaTags += `  <meta property="${prop}" content="${match[1]}">\n`;
            if (prop === "og:title" && pageTitle === slug) {
              pageTitle = match[1];
            }
          }

          // Also check for twitter:name format
          const twitterRegex = new RegExp(
            `<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`,
            "i"
          );
          const twitterMatch = html.match(twitterRegex);
          if (twitterMatch && twitterMatch[1] && !match) {
            ogMetaTags += `  <meta name="${prop}" content="${twitterMatch[1]}">\n`;
          }
        }

        // Extract title if we don't have og:title
        if (!ogMetaTags.includes("og:title")) {
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            pageTitle = titleMatch[1];
            ogMetaTags = `  <meta property="og:title" content="${titleMatch[1]}">\n` + ogMetaTags;
          }
        }
      }
    } catch (error) {
      // If fetching fails, continue without meta tags
      console.error("Failed to fetch destination meta tags:", error);
    }

    // Return HTML with Open Graph meta tags and meta redirect
    return new Response(
      `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
  <title>${pageTitle}</title>

${ogMetaTags}
</head>
<body>
</body>
</html>
  `,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  }

  // Normal browser visit - just redirect
  return Response.redirect(targetUrl, 302);
}
