# HealthProof — Architecture & Development Guide

> Last updated: February 20, 2026

## Table of Contents

- [Product Overview](#product-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Database Schema Overview](#database-schema-overview)
- [Coin Economy](#coin-economy)
- [Authentication](#authentication)
- [Testing](#testing)
- [Go-Public Checklist Progress](#go-public-checklist-progress)
- [Remaining Work](#remaining-work)
- [Key References](#key-references)

---

## Product Overview

HealthProof is a health-claim verification platform focused on the **gym and fitness niche**. Users vote YES/NO on health claims (e.g. "Creatine increases muscle mass"), then an AI analyzes peer-reviewed research to reveal the scientific verdict. Users earn reputation for correct predictions and spend credits to participate.

### Core Loop

1. **Browse claims** — curated fitness/health statements
2. **Vote** (costs 1 credit) — YES or NO, hidden percentages until you commit
3. **Wait 6 hours** (or spend 5 credits) — AI verdict + research breakdown revealed
4. **Earn reputation** — correct predictions boost your score

### User Onboarding

| Action              | Credits Earned |
|---------------------|---------------|
| First visit (guest) | +4            |
| Sign up             | +5            |
| Newsletter opt-in   | +5            |
| Daily login         | +2            |

---

## Tech Stack

| Layer         | Technology                                 |
|---------------|--------------------------------------------|
| Framework     | Next.js 15.1 (App Router, TypeScript)      |
| Database      | PostgreSQL 15+ with pgvector extension     |
| ORM           | Prisma 6.2                                 |
| Auth          | Auth.js (NextAuth v5 beta.25) — JWT strategy |
| Queue         | BullMQ + Redis 7                           |
| AI            | OpenAI (text-embedding-3-small, gpt-4o-mini) |
| Data sources  | PubMed E-utilities, arXiv API              |
| UI            | Tailwind CSS 3.4, shadcn/ui, Recharts     |
| Testing       | Vitest 4.0, React Testing Library, jsdom   |
| Deployment    | Railway (Procfile: web + worker)           |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts    # Auth.js catch-all handler
│   │   │   └── signup/route.ts           # POST — register with credentials
│   │   ├── claims/
│   │   │   ├── route.ts                  # GET (list) + POST (admin create)
│   │   │   └── [claimId]/
│   │   │       ├── route.ts              # GET — single claim detail
│   │   │       ├── vote/route.ts         # POST — place YES/NO vote
│   │   │       └── unlock-analysis/route.ts  # POST — spend 5 credits
│   │   └── coins/
│   │       ├── daily-login/route.ts      # POST — claim daily bonus
│   │       └── history/route.ts          # GET — coin transaction log
│   ├── auth/
│   │   ├── signin/page.tsx               # Client component, credentials + OAuth
│   │   └── signup/page.tsx               # Client component, form → API → auto signIn
│   ├── claims/page.tsx                   # Claims listing (uses <Header/> + <Footer/>)
│   ├── dashboard/page.tsx                # Protected user dashboard
│   ├── layout.tsx                        # Root layout (fonts, SessionProvider)
│   ├── page.tsx                          # Homepage (hero, how-it-works)
│   └── globals.css
├── components/
│   ├── header.tsx                        # Shared header: logo, nav, UserMenu
│   ├── footer.tsx                        # Shared footer: copyright, privacy, terms
│   ├── session-provider.tsx              # "use client" wrapper for NextAuth
│   ├── user-menu.tsx                     # Auth-aware dropdown (credits, sign out)
│   └── ui/                              # shadcn/ui primitives (button, card, etc.)
├── lib/
│   ├── auth.ts                          # Auth.js config (Google, GitHub, Credentials)
│   ├── coin-service.ts                  # Auditable ledger (359 lines)
│   ├── prisma.ts                        # Singleton Prisma client
│   ├── redis.ts                         # Redis connection
│   ├── queue.ts                         # BullMQ queue definitions
│   ├── openai.ts                        # OpenAI client config
│   ├── pubmed.ts                        # PubMed E-utilities API client
│   ├── arxiv.ts                         # arXiv API client
│   ├── cn.ts                            # className merge utility
│   └── utils.ts                         # General utilities
├── types/
│   └── next-auth.d.ts                   # Session type extensions (credits, rep, isAdmin)
├── workers/
│   └── dossier-worker.ts               # BullMQ worker for research jobs
└── __tests__/                           # Vitest test suites (64 tests)
    ├── setup.ts
    ├── api/
    │   ├── auth/signup.test.ts          # 8 tests
    │   └── claims/
    │       ├── claims.test.ts           # 16 tests (GET list + POST create)
    │       ├── claim-detail.test.ts     # 7 tests
    │       └── vote.test.ts            # 11 tests
    ├── auth/
    │   ├── signin.test.tsx             # 7 tests
    │   └── signup.test.tsx             # 7 tests
    └── components/
        └── user-menu.test.tsx          # 8 tests

prisma/
└── schema.prisma                       # 441 lines, 20+ models

notes/                                  # Planning docs (not shipped)
├── go_public_checklist.txt
├── domain_and_hosting_plan.txt
├── rag_engine_plan.txt
├── coin_principle.md
├── coisys_implementation.md
├── revenue-model.md
└── database_info.txt
```

---

## API Reference

### Auth

| Method | Route                    | Auth     | Description                              |
|--------|--------------------------|----------|------------------------------------------|
| `*`    | `/api/auth/[...nextauth]`| —        | Auth.js catch-all (login, callback, etc.)|
| `POST` | `/api/auth/signup`       | Public   | Register: name, email, password, newsletter. Zod validated. Grants signup bonus. |

### Claims

| Method | Route                              | Auth   | Description |
|--------|------------------------------------|--------|-------------|
| `GET`  | `/api/claims`                      | Public | List claims. Query params: `difficulty` (EASY/MEDIUM/HARD), `status` (RESEARCHING/ACTIVE/RESOLVED), `search` (text), `cursor`, `limit` (1–50, default 20). Returns `{ claims, nextCursor }`. |
| `POST` | `/api/claims`                      | Admin  | Create claim + market. Body: `title` (10–500 chars), `description?`, `difficulty?`. Deduplicates via normalized title. |
| `GET`  | `/api/claims/[claimId]`            | Public | Single claim with market stats, evidence papers, and `userVote` (if authenticated). |
| `POST` | `/api/claims/[claimId]/vote`       | Auth   | Vote YES or NO. Costs 1 credit. One vote per user per claim. Creates 6h reveal timer. Updates market counters atomically. |
| `POST` | `/api/claims/[claimId]/unlock-analysis` | Auth | Unlock deep research breakdown. Costs 5 credits (idempotent). |

### Coins

| Method | Route                    | Auth | Description |
|--------|--------------------------|------|-------------|
| `POST` | `/api/coins/daily-login` | Auth | Claim daily login bonus (+2 credits, idempotent per day). |
| `GET`  | `/api/coins/history`     | Auth | Transaction history. Query: `limit`, `offset`, `type`. |

---

## Database Schema Overview

The full schema is in `prisma/schema.prisma` (441 lines). Key models:

### Core Models

| Model | Purpose |
|-------|---------|
| `User` | Auth + gamification (credits, reputation, streak, isAdmin) |
| `Account` / `Session` / `VerificationToken` | Auth.js managed (OAuth accounts, sessions) |
| `GuestSession` | Anonymous users with 4 starting credits |

### Claims & Voting

| Model | Purpose |
|-------|---------|
| `Claim` | Health claim statement with difficulty, normalizedTitle (dedup), revealAt |
| `Market` | Voting market per claim: status (RESEARCHING→ACTIVE→RESOLVED), denormalized vote counts, AI verdict |
| `ClaimVote` | Per-user votes with 6h reveal timer (compound unique: claimId + userId) |
| `GuestVote` | Anonymous votes (compound unique: claimId + guestSessionId) |
| `Forecast` | Future sweepstakes/pool betting (shares model) |

### Credits & Reputation

| Model | Purpose |
|-------|---------|
| `CreditEvent` | Auditable ledger — every coin movement with balanceBefore/After, idempotency key |
| `CoinHold` | Escrow for future pool betting (Phase 2) |
| `ReputationEvent` | Rep point log (correct/wrong prediction, daily bonus, etc.) |

### Research & Evidence

| Model | Purpose |
|-------|---------|
| `Paper` | Academic paper metadata (DOI, PMID, arXiv ID, etc.) |
| `ClaimPaper` | Evidence card linking claim↔paper with AI extraction (stance, confidence, study type) |
| `DocumentChunk` | Paper chunks with pgvector embeddings (1536 dims for text-embedding-3-small) |
| `DossierJob` | BullMQ job tracking (QUEUED→RUNNING→SUCCEEDED/FAILED with progress %) |
| `AlertSubscription` | Future: notify user when new research is available for a claim |

### Key Enums

- `MarketStatus`: RESEARCHING | ACTIVE | RESOLVED
- `ClaimDifficulty`: EASY (+20/−10) | MEDIUM (+25/−12) | HARD (+30/−15)
- `ForecastSide`: YES | NO
- `Stance`: SUPPORTS | REFUTES | NEUTRAL
- `CreditEventType`: 17 types covering earnings, spending, payouts, and system operations

---

## Coin Economy

All coin movements go through `src/lib/coin-service.ts` — a centralized, auditable ledger that ensures:

- **Balance integrity**: balanceBefore/After snapshots on every event
- **Idempotency**: duplicate-safe via unique idempotency keys
- **Transaction safety**: Prisma `$transaction` for atomic balance updates

### Functions

| Function | Amount | Event Type | Idempotent |
|----------|--------|------------|------------|
| `grantGuestCredits(userId)` | +4 | GUEST_INITIAL | ✅ per user |
| `grantSignupBonus(userId)` | +5 | SIGNUP_BONUS | ✅ per user |
| `grantNewsletterBonus(userId)` | +5 | NEWSLETTER_BONUS | ✅ per user |
| `grantDailyLogin(userId, date)` | +2 | DAILY_LOGIN | ✅ per user per day |
| `spendVoteCoins(userId, claimId)` | −1 | VOTE_SPENT | ❌ (by design) |
| `unlockDeepAnalysis(userId, claimId)` | −5 | DEEP_ANALYSIS_UNLOCK | ✅ per user per claim |
| `adminAdjustBalance(userId, amount, reason, adminId)` | ±N | ADMIN_GRANT | ❌ |
| `escrowCoins(userId, marketId, amount)` | −N | (Phase 2) | ❌ |

### Balance Protection

Negative balances are prevented for all types except `ADMIN_GRANT`. If a user has 0 credits and tries to vote, the coin service returns `{ success: false, error: "Insufficient credits" }`.

---

## Authentication

### Providers

1. **Credentials** — email + password (bcrypt, 12 rounds)
2. **Google OAuth**
3. **GitHub OAuth**

### Strategy

- **JWT sessions** (not database sessions) for CDN/edge compatibility
- `PrismaAdapter` for user/account persistence
- Session callback enriches JWT with `credits`, `reputation`, `isAdmin`, `newsletterOptIn` (fresh DB read each request)

### Session Type Extensions

The `next-auth.d.ts` declaration file extends the default session:

```typescript
session.user.id          // string
session.user.credits     // number
session.user.reputation  // number
session.user.isAdmin     // boolean
session.user.newsletterOptIn // boolean
```

### Auth Flow

- **Sign in** → `/auth/signin` (client component, calls `signIn()` from next-auth/react)
- **Sign up** → `/auth/signup` (client component, POST to `/api/auth/signup`, then auto `signIn()`)
- **Sign out** → `UserMenu` component calls `signOut()`
- **Protected routes** → server-side `auth()` check + `redirect("/auth/signin")`

---

## Testing

**64 tests** across 7 files, all passing.

```bash
npm test          # Run all tests once
npm run test:watch # Watch mode
```

### Test Files

| File | Tests | What It Covers |
|------|-------|----------------|
| `api/auth/signup.test.ts` | 8 | Zod validation, duplicate check, signup/newsletter bonuses, DB errors |
| `api/claims/claims.test.ts` | 16 | GET list (pagination, filters, cursor, errors) + POST create (auth, admin, dedup, validation) |
| `api/claims/claim-detail.test.ts` | 7 | 404, anon access, userVote inclusion, papers, compound key lookup, DB errors |
| `api/claims/vote.test.ts` | 11 | Auth, validation, 404, market status, duplicate vote, insufficient credits, success flow, atomicity |
| `auth/signin.test.tsx` | 7 | Form rendering, credentials submit, OAuth buttons, error/loading states |
| `auth/signup.test.tsx` | 7 | API call → auto sign-in, newsletter checkbox, duplicate errors, loading states |
| `components/user-menu.test.tsx` | 8 | Authenticated/unauthenticated states, dropdown, sign-out, outside-click close |

### Mocking Strategy

- **Prisma** — mocked at module level (`vi.mock("@/lib/prisma")`) with per-method `vi.fn()`
- **Auth** — `vi.mock("@/lib/auth")` returns configurable session objects
- **Coin Service** — mocked to isolate route logic from balance operations
- **bcryptjs** — mocked to return static hash (avoid CPU cost)
- **next-auth/react** — mocked for client component tests (`useSession`, `signIn`, `signOut`)

### Configuration

- `vitest.config.ts` — jsdom environment, `@vitejs/plugin-react`, `@/` path alias
- `src/__tests__/setup.ts` — imports `@testing-library/jest-dom/vitest` matchers

---

## Go-Public Checklist Progress

Based on `notes/go_public_checklist.txt`:

| # | Step | Status | Notes |
|---|------|--------|-------|
| 1 | Wire up authentication | ✅ Done | SessionProvider, signin/signup pages, signup API, UserMenu, signOut |
| 2 | Build Claims API + dynamic rendering | ✅ Done | GET/POST /api/claims, GET /api/claims/[id], claims pages use shared layout. Hardcoded cards still on claims page (need dynamic fetch). |
| 3 | Build voting flow | ✅ Done | POST /api/claims/[id]/vote with coin deduction, 6h timer, market counter updates. Frontend vote UI still needed. |
| 4 | Extract shared layout components | ✅ Done | `<Header />` + `<Footer />` extracted, all pages updated |
| 5 | Add essential pages | ❌ Todo | /about, /privacy, /terms, 404, error.tsx, loading.tsx skeletons |
| 6 | Seed data + admin tooling | ❌ Todo | Prisma seed script with 20-30 gym/fitness claims |
| 7 | Daily login + coin economy frontend | ❌ Todo | Backend endpoints exist, no UI yet |
| 8 | Production environment setup | ❌ Todo | PostgreSQL + Redis on Railway, env vars, migrate deploy |
| 9 | Security hardening | ⚠️ Partial | Zod on claims + signup APIs. Still needs: rate limiting, input sanitization |
| 10 | SEO + fitness niche positioning | ❌ Todo | Metadata, robots.txt, sitemap, OG tags |
| 11 | Deploy | ❌ Todo | Procfile ready, needs `npm run build` success + OAuth redirect config |
| 12 | Nice-to-haves | ❌ Todo | Toasts, dark mode, leaderboard, analytics |

### What's Wired End-to-End (Backend → API → Tests)

- ✅ User registration (credentials + OAuth)
- ✅ Sign in / sign out
- ✅ Claim listing with filters + pagination
- ✅ Claim detail with user vote status
- ✅ Admin claim creation with dedup
- ✅ Voting with coin deduction + market updates
- ✅ Deep analysis unlock (idempotent)
- ✅ Daily login bonus
- ✅ Coin transaction history

### What Needs Frontend Wiring

- Claims page: replace hardcoded cards with `fetch("/api/claims")` 
- Vote buttons: call `/api/claims/[id]/vote`, show loading, update UI
- Reveal timer: 6h countdown or "unlock now" button
- Daily login: banner/button to call `/api/coins/daily-login`
- Coin history: panel or page displaying transaction log

---

## Remaining Work

### Immediate Priority (P0)

1. **Dynamic claims page** — fetch from API, render real claim cards
2. **Vote UI** — YES/NO buttons that call the vote API, handle states (loading, voted, revealed)
3. **Seed script** — 20-30 gym/fitness claims with ACTIVE markets

### Next Priority (P1)

4. **Essential pages** — /about, /privacy, /terms (required for OAuth compliance)
5. **Error/loading UX** — not-found.tsx, error.tsx, loading.tsx skeletons
6. **Production infra** — Railway PostgreSQL + Redis provisioning
7. **Coin economy UI** — daily login banner, history panel, unlock button

### Polish (P2)

8. **Rate limiting** — on auth, voting, daily-login endpoints
9. **SEO** — metadata, sitemap, OG tags for social sharing
10. **Mobile nav** — burger menu in header
11. **Deploy** — build, env config, OAuth redirects

### Future Phases (from product roadmap)

- **RAG Engine** — paper retrieval, chunking, pgvector search, LLM synthesis (detailed plan in `notes/rag_engine_plan.txt`)
- **Phase 2: Sentiment & Forecasting** — pool betting with escrow, live sentiment gauge
- **Phase 3: Monetization** — Stripe subscriptions, Pro tier, paper alerts

---

## Key References

| Resource | URL |
|----------|-----|
| Next.js App Router | https://nextjs.org/docs/app |
| Auth.js (NextAuth v5) | https://authjs.dev |
| Prisma Docs | https://www.prisma.io/docs |
| Prisma Transactions | https://www.prisma.io/docs/orm/prisma-client/queries/transactions |
| pgvector | https://github.com/pgvector/pgvector |
| BullMQ | https://docs.bullmq.io/ |
| PubMed E-utilities | https://www.ncbi.nlm.nih.gov/books/NBK25500/ |
| Semantic Scholar API | https://api.semanticscholar.org/api-docs/ |
| OpenAI Structured Outputs | https://platform.openai.com/docs/guides/structured-outputs |
| OpenAI Embeddings | https://platform.openai.com/docs/guides/embeddings |
| Tailwind CSS | https://tailwindcss.com/docs |
| shadcn/ui | https://ui.shadcn.com/docs |
| Vitest | https://vitest.dev |
| Railway | https://docs.railway.app |
