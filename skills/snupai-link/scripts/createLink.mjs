#!/usr/bin/env node

/**
 * snupai.link API - JavaScript wrapper
 *
 * Usage:
 *   export SNUPAI_API_KEY="your_key"
 *   node scripts/createLink.mjs "my-slug" "https://example.com"
 */

const API_URL = "https://snupai.link/api/create";

export async function createShortLink(options) {
  const apiKey = process.env.SNUPAI_API_KEY;

  if (!apiKey) {
    throw new Error("SNUPAI_API_KEY environment variable is required. Get one from https://snupai.link/dashboard");
  }

  const { slug, url, maxClicks, expiresAt } = options;

  // Validate required fields
  if (!slug || typeof slug !== "string") {
    throw new Error("slug is required and must be a string");
  }

  if (!url || typeof url !== "string") {
    throw new Error("url is required and must be a string");
  }

  // Validate slug format
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    throw new Error("slug must contain only letters, numbers, hyphens, and underscores");
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error("url must be a valid URL");
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey,
        slug,
        url,
        maxClicks,
        expiresAt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded: ${data.error}`);
      } else if (response.status === 401) {
        throw new Error(`Invalid API key: ${data.error}`);
      } else if (response.status === 409) {
        throw new Error(`Slug already exists: ${data.error}`);
      } else {
        throw new Error(`API error (${response.status}): ${data.error}`);
      }
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to create short link: ${error}`);
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const [slug, url] = process.argv.slice(2);

  if (!slug || !url) {
    console.error("Usage: node createLink.mjs <slug> <url>");
    console.error("Example: node createLink.mjs my-link https://example.com");
    process.exit(1);
  }

  createShortLink({ slug, url })
    .then((result) => {
      console.log(`✓ Short link created: ${result.shortUrl}`);
      console.log(`  Rate limit remaining: ${result.rateLimitRemaining}`);
    })
    .catch((error) => {
      console.error(`✗ Error: ${error.message}`);
      process.exit(1);
    });
}
