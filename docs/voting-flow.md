# Step 4 — Voting Flow Frontend

> Completed: Feb 2026 · **92 tests passing** (28 new in this step)

## What was built

Three reusable client components and a new detail page that together form the
core voting interaction loop:

| File | Purpose |
|------|---------|
| `src/components/vote-buttons.tsx` | YES / NO voting buttons with full state machine |
| `src/components/claim-card.tsx` | Card rendering a single claim with embedded vote buttons |
| `src/components/claims-list.tsx` | Paginated list that fetches from `/api/claims` |
| `src/app/claims/[claimId]/page.tsx` | Claim detail page — evidence, verdict, vote stats |

The claims listing page (`src/app/claims/page.tsx`) was rewritten to use `<ClaimsList />` instead of hardcoded placeholder cards.

---

## VoteButtons state machine

The component handles **6 mutually exclusive states** derived from session +
claim data:

```
┌─────────────┐
│ not signed in│ → disabled buttons + "Sign in to vote" link
└─────────────┘
┌─────────────┐
│  RESEARCHING │ → "Voting not yet open" message
└─────────────┘
┌─────────────┐
│  RESOLVED    │ → "This claim has been resolved" message
└─────────────┘
┌─────────────┐
│ already voted│ → "You voted YES/NO" + reveal timer or "View results" link
└─────────────┘
┌─────────────┐
│   ready      │ → active YES (green) / NO (red) buttons
└─────────────┘
┌─────────────┐
│  submitting  │ → disabled buttons with "…" text
└─────────────┘
```

On submit: `POST /api/claims/{id}/vote` with `{ side: "YES"|"NO" }`.
On success: calls `onVoted(side)` callback so parent can update UI instantly.
On error: displays inline error message, re-enables buttons.

---

## Hidden percentages design

A key UX decision: **vote percentages are hidden until the user has voted or the
claim is resolved.** This prevents anchoring bias — users shouldn't see "80% say
YES" before making their own judgment.

- `ClaimCard` checks `claim.userVote || claim.market?.status === 'RESOLVED'`
  before rendering the YES/NO percentages.
- The claim detail page renders a colored progress bar (green/red) for
  percentages, but only post-vote.

---

## ClaimsList pagination

Uses **cursor-based pagination** matching the API design:

1. Initial fetch: `GET /api/claims?status=ACTIVE&limit=20`
2. Response includes `nextCursor` (the last claim's ID)
3. "Load More" button sends `GET /api/claims?status=ACTIVE&limit=20&cursor={id}`
4. New claims are appended to the list
5. Button disappears when `nextCursor` is `null`

Supports SSR hydration via optional `initialClaims` / `initialCursor` props.

---

## Claim detail page

Route: `/claims/[claimId]`

Sections rendered (top to bottom):
1. **Breadcrumb** — "← Back to Claims"
2. **Title + difficulty badge** — color-coded: EASY=green, MEDIUM=yellow, HARD=red
3. **Description**
4. **Vote stats panel** — total votes, YES/NO percentages as horizontal bar
   (hidden pre-vote)
5. **AI Verdict** — when resolved, shows verdict text + confidence %
6. **VoteButtons**
7. **Evidence papers** — list with stance-colored left border
   (SUPPORTS=green, REFUTES=red, NEUTRAL=yellow)

---

## Test coverage (28 new tests)

| Test file | Tests | What's covered |
|-----------|-------|----------------|
| `vote-buttons.test.tsx` | 10 | All 6 states, submit success/error, network error, button disabled while submitting |
| `claim-card.test.tsx` | 9 | Title, difficulty badges (3 colors), vote counts, hidden percentages, shown percentages, AI verdict, description, detail link |
| `claims-list.test.tsx` | 9 | Loading skeleton, fetch + render, empty state, error + retry, Load More visible/hidden, cursor pagination, initialClaims bypass |

All tests mock `fetch` and `useSession` (from next-auth/react) at the module
level using `vi.mock`.

---

## API integration summary

| Component | Endpoint | Method |
|-----------|----------|--------|
| ClaimsList | `/api/claims?status=ACTIVE&limit=20` | GET |
| Claim detail page | `/api/claims/{id}` | GET |
| VoteButtons | `/api/claims/{id}/vote` | POST |

All three endpoints were built and tested in **Step 3**.

---

## What's next

- **Step 5** — Essential pages: /about, /privacy, /terms, custom 404, error.tsx,
  loading.tsx
- **Step 6** — Seed data & admin tooling: 20–30 gym/fitness claims with
  realistic evidence
