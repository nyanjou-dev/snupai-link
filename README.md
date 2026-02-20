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

Set in **Vercel** (Project → Settings → Environment Variables):

- `CONVEX_DEPLOYMENT` – your Convex deployment name (e.g. `basic-seal-838`)
- `NEXT_PUBLIC_CONVEX_URL` – **must be the Convex deployment URL**, e.g. `https://basic-seal-838.eu-west-1.convex.cloud` (use the `.convex.cloud` URL from your [Convex dashboard](https://dashboard.convex.dev); do not use the `.convex.site` URL or `null`)
- Convex Auth keys: `JWT_PRIVATE_KEY`, `JWKS` (if you use auth)

On **Convex** (Dashboard → Settings → Environment Variables), ensure `CONVEX_SITE_URL` and `SITE_URL` are set ([Convex Auth production](https://labs.convex.dev/auth/production)).

### Setting SITE_URL dynamically

For each deployment environment (production, preview, etc.), set the `SITE_URL` to match your app's domain:

**Option 1: Automated (recommended)**
```bash
# For Vercel production
VERCEL_URL=snupai-link.vercel.app CONVEX_DEPLOYMENT=prod:your-deployment node scripts/set-site-url.js

# For Vercel preview deployments
VERCEL_URL=your-preview.vercel.app CONVEX_DEPLOYMENT=prod:your-deployment node scripts/set-site-url.js
```

**Option 2: Manual via Convex Dashboard**
- Go to Convex Dashboard → Your Deployment → Settings → Environment Variables
- Set `SITE_URL` to your app's URL (e.g., `https://snupai-link.vercel.app` for production, or `https://your-preview.vercel.app` for previews)

**If sign-in returns 400:** The login form shows the server error message. Common causes:

- **Convex Dashboard** (your deployment → Settings → Environment Variables): set `JWT_PRIVATE_KEY`, `JWKS`, `CONVEX_SITE_URL` (e.g. `https://basic-seal-838.eu-west-1.convex.site`), and `SITE_URL` (your app URL). If any are missing, Convex auth throws and the proxy returns 400 with that message.
- **Vercel**: ensure `NEXT_PUBLIC_CONVEX_URL` is your `.convex.cloud` URL (you already have this).
- Check **Vercel → Logs** (or Runtime Logs) after a failed login to see the exact error from the auth proxy.
- **SITE_URL mismatch**: Ensure `SITE_URL` in Convex matches your deployment domain (e.g., `https://snupai-link.vercel.app` for production).

