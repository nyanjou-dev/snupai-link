# snupai-link

A clean, modern link shortener for **snupai.link**.

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Convex (DB + functions + auth)
- Deploy: Vercel

## Features
- Password auth (Convex Auth)
- Create short links with custom slugs
- Optional expiry date/time per link
- Optional max-click cap per link
- Redirects at `/{slug}`
- Click tracking (count + referrer + timestamp + user agent)
- Dashboard analytics (top links, recent clicks, top referrers)
- Per-link QR code with download/copy actions
- Dashboard to manage links

## Using link controls & analytics

### Expiry
- In **Create Short Link**, set **Expiry (optional)** using your local timezone.
- Expired links redirect to `/unavailable?reason=expired`.
- Minimum lead time is 1 minute from now.

### Max clicks
- Set **Click limit (optional)** to a whole number between `1` and `1,000,000`.
- When limit is reached, the short link redirects to `/unavailable?reason=max-clicks`.

### QR actions
- Each link card shows a small QR preview for quick scan checks.
- Open a link’s details to use:
  - **Download PNG** (saves `{slug}-target-qr.png`)
  - **Copy image** (when clipboard image API is available in your browser)

### Analytics basics
- **Analytics** panel (dashboard) shows:
  - top links by click count
  - recent click activity
- Per-link details show:
  - recent click events (time, referrer, user agent)
  - top referrers for that link

## Local development

1) Install deps
```bash
bun install
```

2) Add secrets to `.env.local` (**do not commit**)
```bash
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...
CONVEX_DEPLOY_KEY=...
```

3) (Recommended) Set Convex Auth keys in your Convex deployment
```bash
node generateKeys.mjs
# then set JWT_PRIVATE_KEY + JWKS in the Convex dashboard or via:
# printf '%s' "$JWT_PRIVATE_KEY" | bunx convex env set JWT_PRIVATE_KEY
# printf '%s' "$JWKS" | bunx convex env set JWKS
```

4) Run Convex (generates `convex/_generated`)
```bash
bunx convex dev
```

5) Run Next.js
```bash
bun run dev
```

Open http://localhost:3000

## Deploy (Vercel)

Set the same env vars in Vercel (`CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, and any Convex Auth env vars like `JWT_PRIVATE_KEY` and `JWKS`).

### Auth-related environment variables

To fix `AuthProviderDiscoveryFailed` and related auth issues, ensure:

**Convex Dashboard** (Settings > Environment Variables):
- `CONVEX_SITE_URL` – auto-set by Convex for your deployment (e.g. `https://YOUR_DEPLOYMENT.eu-west-1.convex.site`)
- `JWT_PRIVATE_KEY` and `JWKS` – required for Convex Auth (see step 3 above)
- `SITE_URL` – your app URL (e.g. `https://snupai-link.vercel.app` or `https://snupai.link`)

**Vercel** (Project > Settings > Environment Variables):
- `NEXT_PUBLIC_CONVEX_URL` – Convex deployment URL (e.g. `https://YOUR_DEPLOYMENT.convex.cloud`)
- `CONVEX_SITE_URL` – set explicitly if auth discovery fails, e.g. `https://YOUR_DEPLOYMENT.eu-west-1.convex.site`

### Debugging auth

Enable verbose auth logging:
```bash
bun run convex:auth-debug
# or: bunx convex env set AUTH_LOG_LEVEL DEBUG
```

For production, remove after debugging (logs include sensitive data).

### Clearing auth state

If you see stale auth errors, clear:
- Cookies (keys prefixed with `__convexAuth` or `__Host-convexAuth`)
- Local storage (same prefixes)
- Or test in an incognito window

### Runtime note (edge vs Node)

Auth requests are handled by the middleware, which runs on the edge. If `AuthProviderDiscoveryFailed` persists after env var checks, the discovery fetch from Vercel edge to the Convex site may be restricted. As a workaround, ensure `CONVEX_SITE_URL` is set in both Convex and Vercel so the auth domain is consistent.

