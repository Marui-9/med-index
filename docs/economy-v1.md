# Economy System - Version 1.0 (Phase 1)

**Last Updated**: February 9, 2026  
**Status**: Active (Phase 1 - Auditable Ledger)

---

## Overview

This document defines the coin economy for HealthProof. Phase 1 establishes an **auditable ledger system** while maintaining simplicity. Future phases will add pool betting and advanced features.

---

## Coin Unit

- **Base unit**: 1 coin (integer)
- **Rounding**: Floor for payouts (Phase 2)
- **Display**: Whole numbers only

---

## Earning Coins

### One-Time Rewards

| Event | Amount | Notes |
|-------|--------|-------|
| Guest initial | +4 | First visit (anonymous users) |
| Signup bonus | +5 | Account creation |
| Newsletter opt-in | +5 | Optional |

### Recurring Rewards (Phase 1 - Reduced)

| Event | Amount | Frequency | Notes |
|-------|--------|-----------|-------|
| Daily login | +2 | Once per day | **Reduced from +10** to prevent inflation |
| 7-day streak | +10 | Weekly | **Reduced from +20** (future feature) |

**Important**: Daily rewards will become **conditional** in Phase 2 (must place at least one bet to claim).

---

## Spending Coins

### Phase 1 Sinks

| Action | Cost | Notes |
|--------|------|-------|
| Vote on claim | -1 | Place prediction |
| Unlock deep analysis | -5 | Full research breakdown (replaces "skip timer") |

### Future Sinks (Phase 2+)

| Action | Cost | Status |
|--------|------|--------|
| Claim proposal deposit | -10 | Not implemented |
| Boost/bounty claim | Variable | Not implemented |
| Tournament entry | Variable | Not implemented |

---

## Ledger System

All coin movements are tracked in the **CreditEvent** table with:

- ✅ **Balance snapshots** (before/after)
- ✅ **Reference tracking** (related claim/market/etc)
- ✅ **Idempotency keys** (prevents double-credits)
- ✅ **Metadata** (flexible JSON for context)

### Services

All coin transactions **MUST** use `CoinService`:

```typescript
import { transferCoins, grantSignupBonus, spendVoteCoins } from "@/lib/coin-service";
```

### Transaction Types

```typescript
enum CreditEventType {
  // Earnings
  GUEST_INITIAL
  SIGNUP_BONUS
  NEWSLETTER_BONUS
  DAILY_LOGIN
  STREAK_BONUS (future)
  
  // Spending
  VOTE_SPENT
  DEEP_ANALYSIS_UNLOCK
  CLAIM_PROPOSAL_DEPOSIT (future)
  
  // Payouts (Phase 2)
  STAKE_PAYOUT
  BOUNTY_PAYOUT
  
  // System
  HOUSE_FEE_BURN (future)
  ADMIN_GRANT
}
```

---

## Anti-Abuse Measures

### Phase 1

- ✅ Idempotency keys (prevent double-claiming)
- ✅ Negative balance prevention
- ✅ One signup bonus per user
- ✅ One daily bonus per day

### Future (Phase 2+)

- Stake caps by reputation
- Rate limits on claim proposals
- Sybil detection
- Anomaly flagging

---

## Economy Health Metrics (Phase 1)

### Issuance Rate (per active user)

```
Signup: 5 coins (once)
Newsletter: 5 coins (once, optional)
Daily login: 2 coins/day

Average daily issuance: ~2-3 coins/user/day
```

### Burn Rate (Phase 1)

```
Votes: -1 per vote
Deep analysis: -5 per unlock

Phase 1: No hard burn (coins spent, not destroyed)
Phase 2: Will add house fee burn (2-5%)
```

### Net Flow

**Phase 1**: Mildly inflationary (acceptable for growth phase)  
**Phase 2**: Will become deflationary with pool betting + house burn

---

## Migration Path

### Phase 1 ✅ (Implemented)

- [x] Auditable ledger (`CreditEvent` with full tracking)
- [x] Reduced daily rewards (10 → 2)
- [x] Improved sinks (deep analysis unlock)
- [x] Idempotent operations
- [x] CoinService abstraction

### Phase 2 (Planned)

- [ ] Pool betting (parimutuel)
- [ ] Escrow system (`CoinHold` table)
- [ ] House fee burn (3%)
- [ ] Conditional daily bonus (require activity)
- [ ] Stake caps by reputation

### Phase 3 (Planned)

- [ ] Claim proposal deposits
- [ ] Bounty/boost system
- [ ] Tournaments
- [ ] Seasonal leaderboards

---

## API Endpoints

### Coin Management

```
POST /api/coins/daily-login
  → Claim daily bonus (idempotent)

GET /api/coins/history
  → Transaction history
  Query: ?limit=50&offset=0&type=DAILY_LOGIN

POST /api/claims/[claimId]/unlock-analysis
  → Spend 5 coins for full research breakdown
```

---

## Database Schema (Phase 1)

### CreditEvent (Ledger)

```prisma
model CreditEvent {
  id             String
  userId         String
  type           CreditEventType
  amount         Int
  
  // Audit trail
  balanceBefore  Int?
  balanceAfter   Int?
  refType        String?  // "claim", "market", etc.
  refId          String?
  
  // Idempotency
  idempotencyKey String? @unique
  
  metadata       Json?
  note           String?
  createdAt      DateTime
}
```

### CoinHold (Phase 2 - Ready)

```prisma
model CoinHold {
  id         String
  userId     String
  marketId   String
  amount     Int
  status     String  // LOCKED, RELEASED, FORFEITED
  createdAt  DateTime
  releasedAt DateTime?
}
```

---

## Monitoring Targets (Phase 2+)

Once pool betting is active, track:

- **Total supply**: All coins in circulation
- **Daily issuance**: New coins created
- **Daily burn**: Coins permanently removed
- **Concentration**: Top 1% holder ratio
- **Retention**: Bettors vs non-bettors

**Target economy**: Deflationary (burn > issuance)

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-09 | 1.0 | Phase 1 implementation: auditable ledger, reduced rewards, improved sinks |

---

## References

- [coin_principle.txt](../notes/coin_principle.txt) - Design philosophy
- [coin_implementation_checklist.txt](../notes/coin_implementation_checklist.txt) - Implementation steps
- [CoinService](../src/lib/coin-service.ts) - Service layer
