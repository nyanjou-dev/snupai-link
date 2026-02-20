import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const { apiKey, slug, url, expiresAt, maxClicks } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid apiKey" },
        { status: 401 }
      );
    }

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid slug" },
        { status: 400 }
      );
    }

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid url" },
        { status: 400 }
      );
    }

    // Validate slug format (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9-_]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug must contain only letters, numbers, hyphens, and underscores" },
        { status: 400 }
      );
    }

    // Call Convex mutation
    const result = await fetchMutation(api.api.createLink, {
      apiKey,
      slug,
      url,
      expiresAt,
      maxClicks,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("API error:", error);

    const errorMessage = error?.message || "Internal server error";

    // Handle specific errors
    if (errorMessage.includes("Rate limit exceeded")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 429 }
      );
    }

    if (errorMessage.includes("Invalid API key")) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    if (errorMessage.includes("Slug already exists")) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 }
      );
    }

    if (errorMessage.includes("Invalid URL")) {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
