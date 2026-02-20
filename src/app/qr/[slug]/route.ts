import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import QRCode from "qrcode";

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

  // Get the link to generate QR for
  const link = await client.query(api.links.getBySlug, { slug });

  if (!link) {
    return new Response("Link not found", { status: 404 });
  }

  // Build the full short URL
  const siteUrl = process.env.SITE_URL || "https://snupai.link";
  const shortUrl = `${siteUrl}/${slug}`;

  // Generate QR code as PNG
  try {
    const qrBuffer = await QRCode.toBuffer(shortUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
    });

    // Convert Buffer to Uint8Array for Edge Runtime
    const qrUint8Array = new Uint8Array(qrBuffer);

    return new Response(qrUint8Array, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (error) {
    console.error("QR generation error:", error);
    return new Response("Failed to generate QR code", { status: 500 });
  }
}
