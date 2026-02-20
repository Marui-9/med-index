# Step 5 — Coin Economy Frontend

> Completed: Feb 2026 · **119 tests passing** (27 new in this step)

## What was built

Four new components, one new page, and integration into three existing pages:

| File | Purpose |
|------|---------|
| `src/components/coin-balance.tsx` | Header badge linking to /coins, shows current credit count |
| `src/components/daily-login-banner.tsx` | Site-wide banner to claim daily +2 coin bonus |
| `src/components/coin-history.tsx` | Paginated transaction history list with type labels |
| `src/app/coins/page.tsx` | Dedicated coin history page with balance, earning/spending info |

### Modified files

| File | Change |
|------|--------|
| `src/components/header.tsx` | Added `<CoinBalance />` between nav links and UserMenu |
| `src/app/page.tsx` | Added `<DailyLoginBanner />` after Header |
| `src/app/claims/page.tsx` | Added `<DailyLoginBanner />` after Header |
| `src/app/dashboard/page.tsx` | Added banner, replaced activity section with `<CoinHistory pageSize={5} />`, credits card now links to /coins |

---

## Component details

### CoinBalance

- Renders as a compact pill/badge: `● 42` (amber dot + count)
- Links to `/coins` page
- Shows animated skeleton during session loading
- Returns `null` when unauthenticated (no flash)
- `credits` value comes from `session.user.credits` via `useSession`

### DailyLoginBanner

Appears at the top of every main page (home, claims, dashboard). Three visual
states:

1. **Idle** (amber) — "🎁 Your daily login bonus is ready!" + "Claim +2 coins" button
2. **Success** (green) — "Daily bonus claimed! +2 coins" confirmation
3. **Error** (red) — error message + "Retry" button

Behavior:
- **localStorage tracking**: Stores `hp-daily-login = YYYY-MM-DD` after claiming.
  On mount, if today's date matches, the banner hides immediately (no API call).
- **Session refresh**: Calls `update()` from `useSession` after claiming so the
  `<CoinBalance>` in the header reflects the new total without page reload.
- **API idempotency**: The backend uses an idempotency key per user+date, so even
  if localStorage is cleared the user won't get double credits.
- Hidden for unauthenticated users.

### CoinHistory

Paginated transaction history table using offset-based pagination:

- Fetches `GET /api/coins/history?limit=N+1&offset=O` (extra item to detect
  "has more")
- Trims the extra item from display; shows "Load More" if it existed
- Each row shows: type label, timestamp, optional note, optional "View claim"
  link, amount (green `+N` or red `-N`), and running balance
- Human-readable type labels via `TYPE_LABELS` map (covers all 20+ CreditEventType
  values)
- Supports `filterType` prop to show only specific transaction types
- Supports `pageSize` prop (default 20; dashboard uses 5)

### Coins page (`/coins`)

Protected route (redirects to signin if unauthenticated). Sections:

1. **Header** with current balance in large amber text
2. **Earning opportunities grid** — Daily Login (+2/day), Newsletter (+5), Sign Up (+5)
3. **Spending info grid** — Vote on Claims (1 coin), Deep Analysis (5 coins)
4. **Full transaction history** via `<CoinHistory />`

---

## Integration with existing code

### Backend endpoints (already existed)

| Endpoint | Method | Used by |
|----------|--------|---------|
| `/api/coins/daily-login` | POST | DailyLoginBanner |
| `/api/coins/history` | GET | CoinHistory |

### Session data flow

```
Auth.js jwt callback
  → fetches credits/reputation from DB on each token refresh
  → stored in JWT token
  → exposed in session.user.credits
  → read by CoinBalance (useSession)
  → read by DailyLoginBanner (useSession + update)
```

After a daily login claim, `update()` triggers a session refresh so the header
badge updates without a full page reload.

---

## Dashboard changes

The dashboard credits card is now:
- Clickable (links to `/coins`)
- Styled with amber color to match the coin theme
- Shows "View history →" sub-text

The "Recent Activity" placeholder was replaced with a live `<CoinHistory
pageSize={5} />` showing the 5 most recent transactions.

---

## Test coverage (27 new tests)

| Test file | Tests | What's covered |
|-----------|-------|----------------|
| `coin-balance.test.tsx` | 6 | Loading skeleton, hidden when unauth, credit count display, default 0, /coins link, sr-only text |
| `daily-login-banner.test.tsx` | 9 | Hidden unauth, hidden loading, claim button, localStorage skip, success flow (API + session update + localStorage), already-claimed API response, error + retry, network error, disabled while loading |
| `coin-history.test.tsx` | 12 | Loading skeleton, fetch + render, green/red amount colors, empty state, error + retry, Load More presence/absence, claim link, filterType param, balance display |

All tests mock `fetch` and `useSession` at module level. DailyLoginBanner tests
also mock `localStorage`.

---

## What's next

Based on the go-public checklist, remaining steps:

- **Step 6** — Essential pages (/about, /privacy, /terms, 404, error.tsx, loading.tsx)
- **Step 7** — Seed data & admin tooling (20–30 gym/fitness claims)
- **Step 8** — Production environment setup (Railway)
