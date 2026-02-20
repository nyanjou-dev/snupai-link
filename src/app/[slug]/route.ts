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

  // Return HTML with embedded iframe and Open Graph meta tags
  return new Response(
    `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${slug} - snupai.link</title>

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${fullUrl}">
  <meta property="og:title" content="${slug} - Short Link">
  <meta property="og:description" content="Shortened link powered by snupai.link">
  <meta property="og:image" content="${siteUrl}/icon.svg">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary">
  <meta property="twitter:url" content="${fullUrl}">
  <meta property="twitter:title" content="${slug} - Short Link">
  <meta property="twitter:description" content="Shortened link powered by snupai.link">
  <meta property="twitter:image" content="${siteUrl}/icon.svg">

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
