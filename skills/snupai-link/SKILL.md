---
name: snupai-link
description: Create short links programmatically on snupai.link URL shortener service. Use this skill when users want to generate short links via curl or programmatically, especially for batch processing, automation, or integration with applications. Rate limited to 10 requests per 5 seconds per API key.
license: MIT
metadata:
  author: snupai
  version: 1.0.0
  homepage: https://snupai.link
  api_endpoint: https://snupai.link/api/create
---

# snupai.link API Skill

Create short links programmatically using the snupai.link API.

## Installation for AI Agents

**AI Agents**: To install this skill, copy the entire `skills/snupai-link/` directory to one of these locations:

- **User-level** (affects all projects): `~/.claude/skills/`
- **Project-level** (affects only this project): `<project-root>/.claude/skills/`

**Installation steps for AI**:
1. Read the current directory to locate `skills/snupai-link/`
2. Copy the entire folder to `~/.claude/skills/` or the project's `.claude/skills/`
3. The skill will be automatically discovered and available for use

**Example installation command**:
```bash
# From the repository root
cp -r skills/snupai-link ~/.claude/skills/
```

## Prerequisites

1. **Get an API Key**:
   - Go to https://snupai.link
   - Sign in or create an account
   - Navigate to **Dashboard** → **API Keys** tab
   - Click "Create new API key"
   - Set environment variable: `export SNUPAI_API_KEY="your_api_key_here"`

2. **Rate Limits**: 10 requests per 5 seconds per API key

## Quick Start

### Basic Usage with curl

```bash
curl -X POST https://snupai.link/api/create \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "snupi_xxxxxxxxxxxx",
    "slug": "my-link",
    "url": "https://example.com/very/long/url"
  }'
```

### With optional expiry and click limit

```bash
curl -X POST https://snupai.link/api/create \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "snupi_xxxxxxxxxxxx",
    "slug": "temp-link",
    "url": "https://example.com/promo",
    "expiresAt": 1735689600000,
    "maxClicks": 500
  }'
```

### Response

```json
{
  "id": "...",
  "slug": "my-link",
  "url": "https://example.com/very/long/url",
  "shortUrl": "https://snupai.link/my-link",
  "rateLimitRemaining": 9
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiKey` | string | Yes | Your API key from the dashboard |
| `slug` | string | Yes | Custom slug (alphanumeric, hyphens, underscores only) |
| `url` | string | Yes | The destination URL to shorten |
| `maxClicks` | number | No | Max clicks allowed (integer, 1–1,000,000). Link becomes unavailable after limit. |
| `expiresAt` | number | No | Expiry as Unix timestamp in **milliseconds**. Must be at least 1 minute in the future. |

## Examples

### Create a simple short link

```bash
curl -X POST https://snupai.link/api/create \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "'"$SNUPAI_API_KEY"'",
    "slug": "demo-link",
    "url": "https://example.com/very/long/url"
  }'
```

### Create a link with expiry and click limit

```bash
curl -X POST https://snupai.link/api/create \
  -H "Content-Type: application/json" \
  -d "{
    \"apiKey\": \"$SNUPAI_API_KEY\",
    \"slug\": \"temporary\",
    \"url\": \"https://example.com\",
    \"maxClicks\": 100,
    \"expiresAt\": $(date -d '+24 hours' +%s)000
  }"
```

### Batch create multiple links

```bash
#!/bin/bash
API_KEY="$SNUPAI_API_KEY"

while IFS= read -r url; do
  slug="link-$(date +%s)-$RANDOM"

  response=$(curl -s -X POST https://snupai.link/api/create \
    -H "Content-Type: application/json" \
    -d "{\"apiKey\":\"$API_KEY\",\"slug\":\"$slug\",\"url\":\"$url\"}")

  echo "$url -> $(echo "$response" | jq -r '.shortUrl')"

  # Check rate limit
  remaining=$(echo "$response" | jq -r '.rateLimitRemaining')
  if [ "$remaining" -lt 2 ]; then
    echo "Approaching rate limit, waiting 5 seconds..."
    sleep 5
  fi
done < urls.txt
```

## Error Handling

| HTTP Status | Error | Solution |
|-------------|-------|----------|
| 401 | Invalid API key | Check your API key in the dashboard |
| 400 | Invalid parameters | Verify slug format, URL validity, expiresAt/maxClicks constraints |
| 403 | Account suspended | Account has been banned by admin |
| 409 | Slug already exists | Choose a different slug |
| 429 | Rate limit / quota exceeded | Wait before making more requests (burst: 10/5s, quota: per-user/5h) |

## JavaScript/Node.js Integration

The `scripts/createLink.mjs` file provides a convenient JavaScript wrapper:

```javascript
import { createShortLink } from './scripts/createLink.mjs';

// Basic
const result = await createShortLink({
  slug: "my-link",
  url: "https://example.com"
});

// With expiry and click limit
const result2 = await createShortLink({
  slug: "promo",
  url: "https://example.com/sale",
  maxClicks: 500,
  expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24h from now
});
```

## Python Integration

```python
import requests
import os
import time

def create_short_link(slug, url, *, max_clicks=None, expires_at=None):
    payload = {
        "apiKey": os.environ["SNUPAI_API_KEY"],
        "slug": slug,
        "url": url,
    }
    if max_clicks is not None:
        payload["maxClicks"] = max_clicks
    if expires_at is not None:
        payload["expiresAt"] = expires_at

    response = requests.post(
        "https://snupai.link/api/create",
        json=payload,
    )
    response.raise_for_status()
    return response.json()

# Basic usage
result = create_short_link("my-link", "https://example.com")
print(f"Short URL: {result['shortUrl']}")

# With expiry (24h from now) and click limit
expires = int((time.time() + 86400) * 1000)  # ms timestamp
result = create_short_link("promo", "https://example.com/sale", max_clicks=100, expires_at=expires)
```

## Tips

- **Auto-generate slugs**: Use timestamps or UUIDs for unique slugs
- **Rate limiting**: The `rateLimitRemaining` field tells you how many requests you have left
- **Slug format**: Only alphanumeric characters, hyphens, and underscores are allowed
- **Expiry timestamps**: Must be in milliseconds (JavaScript `Date.now()` format)

## Support

- Dashboard: https://snupai.link/dashboard
- API Documentation: Available in the API Keys section of the dashboard
- Issues: Contact through the dashboard feedback form
