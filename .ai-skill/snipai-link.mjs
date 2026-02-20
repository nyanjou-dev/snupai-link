/**
 * snupai.link API Skill for AI Agents
 *
 * This skill enables AI agents to create short links programmatically using snupai.link
 *
 * INSTALLATION:
 * 1. Add this file to your agent's skills directory
 * 2. Set environment variable:
 *    SNUPAI_API_KEY=your_api_key_here
 * 3. Import and use the createShortLink function
 *
 * ENVIRONMENT VARIABLES:
 * - SNUPAI_API_KEY: Your API key from https://snupai.link/dashboard (API Keys tab)
 * - SNUPAI_API_URL: Optional, defaults to https://snupai.link/api/create
 */

const DEFAULT_API_URL = "https://snupai.link/api/create";

/**
 * Create a short link on snupai.link
 *
 * @param {Object} options - The link creation options
 * @param {string} options.slug - The custom slug for the short link (alphanumeric, hyphens, underscores only)
 * @param {string} options.url - The destination URL to shorten
 * @param {number} [options.maxClicks] - Optional: Maximum number of clicks allowed
 * @param {number} [options.expiresAt] - Optional: Expiry timestamp in milliseconds
 * @returns {Promise<Object>} Response with id, slug, url, shortUrl, and rateLimitRemaining
 *
 * @example
 * // Basic usage
 * const result = await createShortLink({
 *   slug: "my-custom-link",
 *   url: "https://example.com/very/long/url"
 * });
 *
 * @example
 * // With expiry and click limit
 * const result = await createShortLink({
 *   slug: "temporary-link",
 *   url: "https://example.com",
 *   maxClicks: 100,
 *   expiresAt: Date.now() + 86400000 // 24 hours from now
 * });
 */
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

  const apiUrl = process.env.SNUPAI_API_URL || DEFAULT_API_URL;

  try {
    const response = await fetch(apiUrl, {
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

/**
 * Skill metadata for AI agent frameworks
 */
export const skill = {
  name: "snupai-link",
  version: "1.0.0",
  description: "Create short links on snupai.link",
  author: "snupai",
  homepage: "https://snupai.link",
  functions: [
    {
      name: "createShortLink",
      description: "Create a short link on snupai.link with optional expiry and click limits",
      parameters: {
        slug: {
          type: "string",
          description: "Custom slug for the short link (alphanumeric, hyphens, underscores only)",
          required: true,
        },
        url: {
          type: "string",
          description: "The destination URL to shorten",
          required: true,
        },
        maxClicks: {
          type: "number",
          description: "Optional maximum number of clicks allowed",
          required: false,
        },
        expiresAt: {
          type: "number",
          description: "Optional expiry timestamp in milliseconds",
          required: false,
        },
      },
      returns: {
        id: "string",
        slug: "string",
        url: "string",
        shortUrl: "string",
        rateLimitRemaining: "number",
      },
      rateLimit: "10 requests per 5 seconds per API key",
    },
  ],
};

// Export for Node.js environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createShortLink, skill };
}
