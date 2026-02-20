# snupai.link AI Skill

AI agent skill for creating short links programmatically on snupai.link.

## Installation

### For Claude Code / Claude Desktop

1. Copy the `.ai-skill/snipai-link.mjs` file to your Claude skills directory:
   ```bash
   # macOS
   cp .ai-skill/snipai-link.mjs ~/Library/Application\ Support/Claude/claude-desktop/skills/

   # Linux
   cp .ai-skill/snipai-link.mjs ~/.config/claude-desktop/skills/
   ```

2. Add your API key to environment variables:
   ```bash
   # In your shell profile (~/.zshrc or ~/.bashrc)
   export SNUPAI_API_KEY="your_api_key_here"
   ```

3. Restart Claude Desktop

### For AutoGPT / BabyAGI

1. Copy the skill file to your agent's skills directory
2. Set `SNUPAI_API_KEY` in your `.env` file
3. Import and use the `createShortLink` function

### For Custom Node.js Agents

```javascript
import { createShortLink } from "./snipai-link.mjs";

// Set environment variable
process.env.SNUPAI_API_KEY = "your_api_key_here";

// Create a short link
const result = await createShortLink({
  slug: "my-link",
  url: "https://example.com/very/long/url"
});

console.log(`Short URL: ${result.shortUrl}`);
```

## Usage

### Basic Example

```javascript
const result = await createShortLink({
  slug: "my-custom-link",
  url: "https://example.com/very/long/url"
});

// Returns:
// {
//   id: "...",
//   slug: "my-custom-link",
//   url: "https://example.com/very/long/url",
//   shortUrl: "https://snupai.link/my-custom-link",
//   rateLimitRemaining: 9
// }
```

### With Expiry and Click Limit

```javascript
const result = await createShortLink({
  slug: "temporary-link",
  url: "https://example.com",
  maxClicks: 100,  // Link expires after 100 clicks
  expiresAt: Date.now() + 86400000  // Link expires in 24 hours
});
```

## Rate Limiting

- **10 requests per 5 seconds** per API key
- The `rateLimitRemaining` field in the response shows how many requests you have left
- When rate limit is exceeded, the function will throw an error

## Getting an API Key

1. Go to https://snupai.link
2. Sign in or create an account
3. Navigate to **Dashboard** → **API Keys** tab
4. Click **Create new API key**
5. Enter a name (e.g., "My AI Agent")
6. Copy the generated API key
7. Set it as `SNUPAI_API_KEY` in your environment

## Function Reference

### `createShortLink(options)`

Creates a short link on snupai.link.

**Parameters:**
- `slug` (string, required): Custom slug for the short link
  - Only alphanumeric characters, hyphens, and underscores
- `url` (string, required): The destination URL to shorten
- `maxClicks` (number, optional): Maximum number of clicks allowed
- `expiresAt` (number, optional): Expiry timestamp in milliseconds

**Returns:**
- `id` (string): Internal ID of the link
- `slug` (string): The slug
- `url` (string): The destination URL
- `shortUrl` (string): The complete short URL
- `rateLimitRemaining` (number): Requests remaining in rate limit window

**Errors:**
- Throws if `SNUPAI_API_KEY` is not set
- Throws if slug or URL is invalid
- Throws if slug already exists (409)
- Throws if rate limit is exceeded (429)
- Throws if API key is invalid (401)

## Example: Full Agent Integration

```javascript
import { createShortLink } from "./snipai-link.mjs";

async function processUrls(urls) {
  const results = [];

  for (const [index, url] of urls.entries()) {
    try {
      // Generate a slug from the URL
      const slug = `link-${Date.now()}-${index}`;

      const result = await createShortLink({
        slug,
        url,
      });

      results.push({
        original: url,
        short: result.shortUrl,
        success: true,
      });

      // Rate limit handling
      if (result.rateLimitRemaining < 2) {
        console.log("Approaching rate limit, waiting...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      results.push({
        original: url,
        error: error.message,
        success: false,
      });
    }
  }

  return results;
}

// Usage
const urls = [
  "https://example.com/page1",
  "https://example.com/page2",
  "https://example.com/page3",
];

const shortLinks = await processUrls(urls);
console.table(shortLinks);
```

## Support

For issues or questions:
- Website: https://snupai.link
- API Documentation: Available in the Dashboard → API Keys section

## License

This skill is provided as-is for use with the snupai.link service.
