# snupai-link

A clean, modern link shortener for **snupai.link**.

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Convex (DB + functions + auth)
- Deploy: Vercel

## Features
- Password auth (Convex Auth)
- Create short links with custom slugs
- Redirects at `/{slug}`
- Click tracking (count + referrer + timestamp + user agent)
- Dashboard to manage links

## Local development

1) Install deps
```bash
npm install
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
# printf '%s' "$JWT_PRIVATE_KEY" | npx convex env set JWT_PRIVATE_KEY
# printf '%s' "$JWKS" | npx convex env set JWKS
```

4) Run Convex (generates `convex/_generated`)
```bash
npx convex dev
```

5) Run Next.js
```bash
npm run dev
```

Open http://localhost:3000

## Deploy (Vercel)
Set the same env vars in Vercel (`CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, and any Convex Auth env vars like `JWT_PRIVATE_KEY` and `JWKS`).

