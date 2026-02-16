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

Set the same env vars in Vercel: `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, and Convex Auth keys (`JWT_PRIVATE_KEY`, `JWKS`). On Convex, ensure `CONVEX_SITE_URL` and `SITE_URL` are set ([Convex Auth production](https://labs.convex.dev/auth/production)).

This project uses a [patch](patches/) on `@convex-dev/auth` (token_endpoint + CORS on discovery) so auth works in production; applied via `postinstall`.

