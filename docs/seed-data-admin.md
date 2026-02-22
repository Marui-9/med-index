# Step 7 — Seed Data & Admin Tooling

**Date:** February 20, 2026
**Status:** ✅ Complete
**Tests added:** 55 (205 total, 21 test files)

---

## Overview

Step 7 implements the seed data pipeline and admin dashboard for managing health claims. This includes a Prisma seed script with 25 gym/fitness claims, admin-only API routes for CRUD + resolution, and a full admin UI with table view, create form, and resolve modal.

---

## Files Created

### Seed Script

| File | Purpose |
|------|---------|
| `prisma/seed-data.ts` | 25 gym/fitness claims with titles, descriptions, difficulty, market status, votes, and AI verdicts |
| `prisma/seed.ts` | Executable seed script — creates admin user + upserts all 25 claims (idempotent) |

### Admin API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/claims` | GET | Paginated admin claim list with full market details + counts |
| `/api/admin/claims/[claimId]` | PATCH | Update claim title, description, difficulty, market status |
| `/api/admin/claims/[claimId]` | DELETE | Permanently delete a claim (cascade) |
| `/api/admin/claims/[claimId]/resolve` | POST | Resolve a claim with AI verdict, confidence, and consensus summary |

### Admin UI

| File | Purpose |
|------|---------|
| `src/app/admin/page.tsx` | Admin dashboard — table view, stats cards, filter, pagination |
| `src/app/admin/layout.tsx` | Admin layout with `noindex` metadata |
| `src/app/admin/loading.tsx` | Loading skeleton for admin page |
| `src/components/admin/claim-row.tsx` | Table row with difficulty/status badges, vote counts, action buttons |
| `src/components/admin/create-claim.tsx` | Inline create form with title, description, difficulty fields |
| `src/components/admin/resolve-modal.tsx` | Modal dialog for setting AI verdict, confidence, and consensus summary |

### Tests

| File | Tests | Coverage |
|------|-------|----------|
| `src/__tests__/api/admin/admin-claims-list.test.ts` | 6 | Auth, pagination, filtering, error handling |
| `src/__tests__/api/admin/admin-claims-crud.test.ts` | 12 | PATCH + DELETE: auth, 404, validation, success, DB errors |
| `src/__tests__/api/admin/admin-resolve.test.ts` | 8 | Resolve: auth, 404, no market, already resolved, success |
| `src/__tests__/components/admin-components.test.tsx` | 20 | ClaimRow, CreateClaim, ResolveModal rendering + interactions |
| `src/__tests__/seed/seed-data.test.ts` | 9 | Data integrity: 25 claims, uniqueness, difficulty/status mix, fitness keywords |

---

## Seed Data Summary

**25 claims** across the gym/fitness/nutrition niche:

- **5 EASY** — well-established claims (creatine, protein threshold, stretching myth, whey vs plant, anabolic window)
- **9 MEDIUM** — active debate topics (cold plunges, BCAAs, training to failure, intermittent fasting, caffeine, sauna, high-rep training, sleep, foam rolling)
- **11 HARD** — emerging/controversial (turkesterone, ashwagandha, carb cycling, collagen, BFR training, protein per meal, mouth taping, natural lifter limits, ZMA, weightlifting belt, massage guns)

**Status distribution:**
- 8 RESOLVED (with AI verdict, confidence score, and consensus summary)
- 16 ACTIVE (open for voting, with simulated vote counts)
- 1 RESEARCHING (no votes yet)

### Running the Seed

```bash
# Set admin password (optional, defaults to admin123!)
export ADMIN_PASSWORD="your-secure-password"

# Run the seed
npm run db:seed
```

The seed is idempotent — running it multiple times won't create duplicates. It checks `normalizedTitle` before inserting each claim.

---

## Admin API Details

### Authentication
All admin routes require:
1. Valid session (401 if missing)
2. `isAdmin: true` on the user (403 if not admin)

Middleware at `/admin` also redirects unauthenticated users to sign-in.

### GET /api/admin/claims

Query params:
- `page` (default: 1)
- `limit` (default: 50, max: 50)
- `status` — filter by RESEARCHING | ACTIVE | RESOLVED

Response includes `_count` for `claimVotes`, `claimPapers`, and `dossierJobs`.

### PATCH /api/admin/claims/[claimId]

Body (all optional):
- `title` (min 10, max 500)
- `description` (max 2000)
- `difficulty` — EASY | MEDIUM | HARD
- `status` — RESEARCHING | ACTIVE | RESOLVED

### POST /api/admin/claims/[claimId]/resolve

Body (all required):
- `aiVerdict` — YES | NO
- `aiConfidence` — 0.0 to 1.0
- `consensusSummary` — 10 to 5000 chars

Returns 409 if claim is already resolved.

---

## Admin Dashboard Features

- **Stats cards** — Total, Active, Resolved, Researching counts
- **Status filter** — Dropdown to filter by market status
- **Claims table** — Title (linked), difficulty badge, status badge, vote counts with percentages, verdict display
- **Actions per row:**
  - **Resolve** — Opens modal (only for non-resolved claims)
  - **Activate** — Moves RESEARCHING → ACTIVE
  - **Delete** — Confirmation dialog, then cascade delete
- **Create form** — Inline toggle with title, description, difficulty
- **Pagination** — Previous/Next with page count

---

## Package.json Changes

Added script:
```json
"db:seed": "tsx prisma/seed.ts"
```
