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

    // Validate optional expiresAt
    if (expiresAt !== undefined) {
      if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
        return NextResponse.json(
          { error: "expiresAt must be a Unix timestamp in milliseconds" },
          { status: 400 }
        );
      }
      if (expiresAt <= Date.now() + 60_000) {
        return NextResponse.json(
          { error: "expiresAt must be at least 1 minute in the future" },
          { status: 400 }
        );
      }
    }

    // Validate optional maxClicks
    if (maxClicks !== undefined) {
      if (typeof maxClicks !== "number" || !Number.isInteger(maxClicks)) {
        return NextResponse.json(
          { error: "maxClicks must be an integer" },
          { status: 400 }
        );
      }
      if (maxClicks < 1 || maxClicks > 1_000_000) {
        return NextResponse.json(
          { error: "maxClicks must be between 1 and 1,000,000" },
          { status: 400 }
        );
      }
    }

    // Call Convex mutation
    const result = await fetchMutation(api.api.createLink, {
      apiKey,
      slug,
      url,
      expiresAt: expiresAt ?? undefined,
      maxClicks: maxClicks ?? undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("API error:", error);

    const errorMessage = error?.message || "Internal server error";

    // Handle specific errors
    if (errorMessage.includes("Account suspended")) {
      return NextResponse.json(
        { error: "Account suspended" },
        { status: 403 }
      );
    }

    if (errorMessage.includes("Rate limit exceeded") || errorMessage.includes("Quota exceeded")) {
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
