# Step 6 — Essential Pages

> Completed: Feb 2026 · **150 tests passing** (31 new in this step)

## What was built

### Content pages

| Route | File | Purpose |
|-------|------|---------|
| `/about` | `src/app/about/page.tsx` | Mission, how-it-works, coin economy, AI transparency, CTAs |
| `/privacy` | `src/app/privacy/page.tsx` | 9-section privacy policy with contact email |
| `/terms` | `src/app/terms/page.tsx` | 11-section terms of service with medical disclaimer |

All three use the standard `<Header />` + `<Footer />` layout, have SEO metadata
via `export const metadata`, and are server-rendered static pages.

### Error handling

| File | Purpose |
|------|---------|
| `src/app/not-found.tsx` | Custom 404 page — "Page Not Found" with Go Home + Browse Claims links |
| `src/app/error.tsx` | Global error boundary ("use client") — "Something went wrong" with Try Again + Go Home, logs error, shows digest ID |

### Loading skeletons

| File | Mimics |
|------|--------|
| `src/app/loading.tsx` | Generic page (title + content blocks) |
| `src/app/claims/loading.tsx` | ClaimsList (5 card skeletons with badge + buttons) |
| `src/app/claims/[claimId]/loading.tsx` | Claim detail (breadcrumb, title, vote bar, evidence) |
| `src/app/dashboard/loading.tsx` | Dashboard (4 stat cards, sections) |
| `src/app/coins/loading.tsx` | Coin history (balance card, grids, transaction rows) |

Each skeleton matches the actual page layout so the transition from loading to
content is smooth (no layout shift).

---

## Design decisions

### About page content
Structured for the gym/fitness niche audience:
- **Mission** — frames the problem (health misinformation) and solution (crowd + AI)
- **How It Works** — 5-step flow matching the actual UX
- **Coins & Credits** — clear table of earning/spending
- **AI Transparency** — explains verdict format, cited papers, stance labels
- **Built With** — brief tech mention for credibility
- **CTAs** — "Browse Claims" + "Create Account"

### Privacy & Terms
Written for a real product launch:
- Privacy covers: data collected, usage, sharing (explicitly "we don't sell"),
  cookies/localStorage, retention, GDPR-style rights, security, contact
- Terms covers: acceptance, description, **medical disclaimer** (critical),
  accounts (13+, one-per-person), virtual coins (no monetary value, adjustable),
  acceptable use (no bots), IP, liability limit, termination, changes, contact

### Error boundary
- Client component (`"use client"`) as required by Next.js
- Logs to `console.error` (replace with Sentry/etc. in production)
- Shows error digest for support reference
- `reset()` callback for retry without full refresh

### Loading skeletons
- Use `animate-pulse` on `bg-muted` blocks to match Tailwind conventions
- Each skeleton mirrors the specific page layout to prevent cumulative layout shift
- Route-level skeletons (`loading.tsx` in each directory) are picked up
  automatically by Next.js during navigation

---

## Test coverage (31 new tests)

| Test file | Tests | What's covered |
|-----------|-------|----------------|
| `essential-pages.test.tsx` | 19 | About (6): title, mission, how-it-works, coins, CTAs, AI transparency. Privacy (4): title, date, all 9 sections, contact email. Terms (5): title, date, all 11 sections, medical disclaimer, coins disclaimer. 404 (4): 404 text, title, Go Home, Browse Claims. |
| `error-boundary.test.tsx` | 7 | Heading, description, digest shown/hidden, reset called on Try Again, Go Home link, console.error logging |
| `loading-skeletons.test.tsx` | 5 | Each skeleton renders with correct number of animated elements |

All page tests mock `next-auth/react` (required because `<Header>` renders
`<CoinBalance>` and `<UserMenu>` which call `useSession`).

---

## Footer integration

The footer already linked to `/privacy` and `/terms` from Step 2. Those links
now resolve to real pages.

The About page is linked from the homepage hero ("How It Works" button) — this
also already existed.

---

## What's next

- **Step 7** — Seed data & admin tooling (20–30 gym/fitness claims)
- **Step 8** — Production environment setup (Railway)
