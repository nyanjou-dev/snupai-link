import { NextRequest, NextResponse } from "next/server";
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
    return new NextResponse("Missing NEXT_PUBLIC_CONVEX_URL", { status: 500 });
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
      return new NextResponse("Not found", { status: 404 });
    }

    const reason = result.reason === "max_clicks" ? "max-clicks" : "expired";
    const unavailableUrl = new URL(`/unavailable?reason=${reason}`, req.url);
    return NextResponse.redirect(unavailableUrl, { status: 302 });
  }

  return NextResponse.redirect(result.url, { status: 302 });
}
