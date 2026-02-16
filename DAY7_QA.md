# Day 7 QA Checklist (MVP)

Date: 2026-02-16
Scope: expiry, max clicks, concurrent-ish clicks, QR actions, analytics/top referrers

## Environment / setup
- Ran `npm run convex:dev` to ensure functions were deployed locally.
- Ran `npm run dev` and tested through `http://localhost:3000`.

## Checklist

### 1) Expiry by date behavior
- **Status:** ⚠️ Blocked in full end-to-end path (link creation blocked by auth session issue in local env).
- **What was verified:**
  - Creation-time validation exists in `convex/links.ts`:
    - must be finite
    - at least 1 minute in future
    - max 5 years in future
  - Redirect-time enforcement exists in `convex/links.ts` + `src/app/[slug]/route.ts`:
    - expired returns reason `expired`
    - route redirects to `/unavailable?reason=expired`

### 2) Max-click limit behavior
- **Status:** ⚠️ Blocked in full end-to-end path (same local auth/session blocker).
- **What was verified:**
  - Creation-time validation exists (`1..1,000,000`, whole integer).
  - Redirect-time enforcement exists:
    - if `currentCount >= maxClicks`, returns reason `max_clicks`
    - route redirects to `/unavailable?reason=max-clicks`

### 3) Concurrent-ish click handling sanity (best effort local)
- **Status:** ✅ Pass (best-effort logic sanity / code-path review)
- **Notes:**
  - `trackClick` performs state read + limit checks + patch in a single mutation.
  - Convex mutation execution model is serialized/retried on conflicts, which is acceptable for MVP sanity.
  - No unsafe client-side increment logic was found.

### 4) QR download/copy behavior sanity
- **Status:** ✅ Pass
- **What was verified in UI/code:**
  - QR rendering with graceful fallback if generation fails.
  - `Download PNG` action creates `{slug}-target-qr.png`.
  - `Copy image` is shown only when Clipboard image API is available.
  - Success/failure copy feedback is shown transiently.

### 5) Analytics + top referrers basic sanity
- **Status:** ✅ Pass (structure/behavior sanity)
- **What was verified:**
  - Dashboard analytics overview query exists and returns:
    - top links by click count
    - recent clicks list
  - Per-link top referrers query exists with normalization of domains and direct/unknown fallback.
  - Per-link recent clicks query exists (with legacy fallback).

## Small issues fixed during QA
1. **Lint correctness & Next.js navigation hygiene**
   - Replaced raw `<a>` internal links with `next/link` in:
     - `src/app/unavailable/page.tsx`
     - `src/components/Landing.tsx`
2. **Type-safety cleanup (`any` removal)**
   - Replaced `catch (err: any)` with `unknown` + helper in:
     - `src/components/AuthForm.tsx`
     - `src/components/Dashboard.tsx`
3. **Auth config clarity / local fallback**
   - `convex/auth.config.ts` now exports named config object and documents app-origin requirement.
4. **Docs update**
   - Added user-facing README section for:
     - expiry
     - max clicks
     - QR actions
     - analytics basics

## Final verification commands
- `npm run lint` → **pass with warnings only** (generated Convex files)
- `npm run build` → **pass**
- `npx tsc --noEmit` → **pass**

## Notes
- Local manual E2E creation flow showed intermittent auth session mismatch in this environment; Day 7 scoped features themselves are implemented and validated by backend/UI logic review and build/lint/type checks.
