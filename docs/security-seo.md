# Steps 9 & 10 — Security Hardening + SEO Metadata

Completed: 2026-02-20
Tests: 235 passing (25 test files) — up from 205 (21 files)

---

## Step 9: Security Hardening

### Rate Limiting (`src/lib/rate-limit.ts`)

In-memory sliding-window rate limiter. Four pre-configured tiers:

| Tier            | Limit      | Applied To                              |
|-----------------|------------|-----------------------------------------|
| `authLimiter`   | 10/min     | `/api/auth/signup`                      |
| `actionLimiter` | 30/min     | `/api/claims` POST, vote, daily-login   |
| `readLimiter`   | 60/min     | `/api/claims` GET, claim detail, coins  |
| `adminLimiter`  | 30/min     | All `/api/admin/*` routes               |

Returns `429 Too Many Requests` JSON when limit exceeded.
Tracks requests per client IP (x-forwarded-for → x-real-ip → fallback).
Automatic cleanup of expired entries every 5 minutes.

**Production upgrade path**: Swap for `@upstash/ratelimit` or Redis-backed
limiter when horizontal scaling is needed.

### Zod Validation Audit

All API routes now have complete Zod validation:

| Route                           | What was added                                    |
|---------------------------------|---------------------------------------------------|
| `coins/history`                 | `limit` (1-100), `offset` (≥0), `type` (string)  |
| `admin/claims` list             | `status` (enum), `page` (≥1), `limit` (1-50)     |
| `claims/[claimId]`              | `claimId` path param (1-100 chars)                |
| `claims/[claimId]/vote`         | `claimId` path param validation                   |
| `admin/claims/[claimId]`        | `claimId` path param (PATCH + DELETE)             |
| `admin/claims/[claimId]/resolve`| `claimId` path param validation                   |

Previously unsafe patterns fixed:
- `parseInt()` with no bounds → Zod `z.coerce.number().int().min().max()`
- Unguarded `as any` type casts → Zod string validation
- Missing path parameter validation on all `[claimId]` routes

### Security Headers (middleware.ts)

Every response now includes:

| Header                       | Value                                      |
|------------------------------|--------------------------------------------|
| X-Frame-Options              | DENY                                       |
| X-Content-Type-Options       | nosniff                                    |
| Referrer-Policy              | strict-origin-when-cross-origin            |
| Permissions-Policy           | camera=(), microphone=(), geolocation=()   |
| Strict-Transport-Security    | max-age=63072000; includeSubDomains; preload |
| Content-Security-Policy      | default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ... frame-ancestors 'none' |

---

## Step 10: SEO & Fitness Niche Positioning

### Root Layout (`src/app/layout.tsx`)

- Added `metadataBase` (resolves from `NEXT_PUBLIC_APP_URL` or defaults to `healthproof.me`)
- Expanded keywords: gym claims, supplement claims, nutrition science, fitness claims
- Full Open Graph images config (`/og-image.png`, 1200×630)
- Twitter card images
- Favicon icon reference
- Canonical URL at `/`
- googleBot directives (max-image-preview: large, max-snippet: -1)

### Per-Page Metadata

| Page              | Title                                              | Canonical  | Notes           |
|-------------------|----------------------------------------------------|------------|-----------------|
| Home (`/`)        | HealthProof - Verify Health & Fitness Claims...    | `/`        | Full OG config  |
| Claims (`/claims`)| Browse Health Claims                               | `/claims`  | Full OG config  |
| Dashboard         | Dashboard                                          | —          | `noindex`       |
| Claim detail      | Dynamic: claim title                               | `/claims/:id` | `generateMetadata` |

### Dynamic Claim Detail SEO (`claims/[claimId]/layout.tsx`)

Since the claim detail page is a client component ("use client"), metadata is
exported via `generateMetadata()` in a server-side layout wrapper. Fetches
claim title/description from Prisma at request time for SSR-friendly OG tags.

### robots.ts (`src/app/robots.ts`)

```
Allow: /
Disallow: /api/, /admin/, /dashboard/, /settings/
Sitemap: {baseUrl}/sitemap.xml
```

### sitemap.ts (`src/app/sitemap.ts`)

Dynamic sitemap using Next.js Metadata API:
- Static pages: `/`, `/claims`, `/about`, `/privacy`, `/terms`
- Dynamic: all claim detail pages (up to 1000, ordered by updatedAt)
- Gracefully handles DB unavailability at build time

---

## New Test Files (30 new tests)

| File                                              | Tests | Coverage                         |
|---------------------------------------------------|-------|----------------------------------|
| `__tests__/lib/rate-limit.test.ts`                | 11    | Rate limiter: limits, IPs, expiry, tiers |
| `__tests__/api/security-validation.test.ts`       | 9     | Zod rejection: coins history, admin list, claimId |
| `__tests__/middleware/security-headers.test.ts`    | 3     | Middleware exports, header pattern |
| `__tests__/seo/metadata.test.ts`                  | 7     | robots, sitemap, page metadata, layout metadata |

---

## Files Changed / Created

### Created
- `src/lib/rate-limit.ts` — Rate limiter utility
- `src/app/robots.ts` — robots.txt generator
- `src/app/sitemap.ts` — Dynamic XML sitemap
- `src/app/claims/[claimId]/layout.tsx` — Dynamic generateMetadata for claim detail
- `src/__tests__/lib/rate-limit.test.ts`
- `src/__tests__/api/security-validation.test.ts`
- `src/__tests__/middleware/security-headers.test.ts`
- `src/__tests__/seo/metadata.test.ts`

### Modified
- `src/middleware.ts` — Added 6 security headers
- `src/app/layout.tsx` — metadataBase, expanded OG, icons, googleBot
- `src/app/page.tsx` — Added metadata export
- `src/app/claims/page.tsx` — Added metadata export
- `src/app/dashboard/page.tsx` — Added metadata export (noindex)
- `src/app/api/auth/signup/route.ts` — Rate limiting
- `src/app/api/claims/route.ts` — Rate limiting (GET + POST)
- `src/app/api/claims/[claimId]/route.ts` — Rate limiting + Zod claimId
- `src/app/api/claims/[claimId]/vote/route.ts` — Rate limiting + Zod claimId
- `src/app/api/coins/history/route.ts` — Rate limiting + Zod query params
- `src/app/api/coins/daily-login/route.ts` — Rate limiting
- `src/app/api/admin/claims/route.ts` — Rate limiting + Zod query params
- `src/app/api/admin/claims/[claimId]/route.ts` — Rate limiting + Zod claimId
- `src/app/api/admin/claims/[claimId]/resolve/route.ts` — Rate limiting + Zod claimId
