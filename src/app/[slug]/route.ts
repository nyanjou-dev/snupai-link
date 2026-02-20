import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

export const runtime = "edge";

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
    return Response.redirect(unavailableUrl.toString(), { status: 302 });
  }

  // Render the destination URL in an embed instead of redirecting
  const targetUrl = result.url;
  const siteUrl = process.env.SITE_URL || "https://snupai.link";
  const fullUrl = `${siteUrl}/${slug}`;

  // Fetch destination page to extract Open Graph meta tags
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
          if (prop === "og:title" && !pageTitle) {
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

  // Return HTML with embedded iframe and mirrored Open Graph meta tags
  return new Response(
    `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>

${ogMetaTags}
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body, #embed {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    #embed {
      border: none;
    }
    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #666;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <div id="embed">
    <div class="loading">Loading...</div>
    <iframe
      src="${targetUrl}"
      sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation-by-user-activation"
      onload="this.style.display='block'; document.querySelector('.loading')?.remove();"
    ></iframe>
  </div>
  <script>
    // Handle iframe navigation errors gracefully
    const iframe = document.querySelector('iframe');
    iframe.addEventListener('error', () => {
      document.querySelector('.loading')?.textContent = 'Unable to load preview';
      document.querySelector('.loading')?.style.color = '#c00';
    });
  </script>
</body>
</html>
  `,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
      },
    }
  );
}
