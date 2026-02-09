# Phase 1 Implementation Summary

## ✅ What Was Implemented

### 1. Auditable Ledger System

**Schema Updates** ([prisma/schema.prisma](../prisma/schema.prisma))
- ✅ Enhanced `CreditEvent` model with:
  - Balance snapshots (`balanceBefore`, `balanceAfter`)
  - Reference tracking (`refType`, `refId`)
  - Idempotency keys (prevent double-credits)
  - Flexible metadata (JSON)
  - Additional indexes for performance
  
- ✅ Added `CoinHold` model (Phase 2-ready escrow system)
- ✅ Expanded `CreditEventType` enum with 20+ transaction types

### 2. CoinService Layer

**New Service** ([src/lib/coin-service.ts](../src/lib/coin-service.ts))
- ✅ `transferCoins()` - Core transfer function with audit trail
- ✅ `grantSignupBonus()` - Idempotent signup bonus
- ✅ `grantDailyLogin()` - Idempotent daily bonus
- ✅ `spendVoteCoins()` - Vote spending
- ✅ `unlockDeepAnalysis()` - New sink (replaces "skip timer")
- ✅ `getCoinHistory()` - Transaction history
- ✅ `escrowCoins()` - Phase 2-ready betting escrow

**Benefits:**
- All transactions go through one layer
- Automatic balance integrity checks
- Prevents negative balances
- Full audit trail for every coin movement

### 3. Reduced Rewards (Anti-Inflation)

**Before vs After** ([src/lib/utils.ts](../src/lib/utils.ts))

| Reward | Phase 0 | Phase 1 | Change |
|--------|---------|---------|--------|
| Guest initial | 4 | 4 | Same |
| Signup bonus | 5 | 5 | Same |
| Newsletter | 5 | 5 | Same |
| **Daily login** | **10** | **2** | **-80%** |
| **7-day streak** | **20** | **10** | **-50%** |

**Impact:**
- Prevents runaway inflation
- Makes coins feel more valuable
- Daily rewards will become **conditional** in Phase 2 (require activity)

### 4. Improved Sinks

**Before:**
- Vote: -1 credit ✅ (kept)
- Skip timer: -5 credits ❌ (felt arbitrary)

**After:**
- Vote: -1 credit ✅
- **Unlock deep analysis: -5 credits** ✅ (meaningful content unlock)
  - Full research breakdown
  - Methodology details
  - Effect size summaries
  - "What would change the verdict"

### 5. API Endpoints

**New Endpoints:**
- `POST /api/coins/daily-login` - Claim daily bonus (idempotent)
- `GET /api/coins/history` - View transaction history
- `POST /api/claims/[claimId]/unlock-analysis` - Unlock full research

### 6. Documentation

- ✅ **Economy spec**: [docs/economy-v1.md](../docs/economy-v1.md)
  - Earning/spending rules
  - Ledger system explained
  - Migration path to Phase 2
  - Monitoring targets

---

## 🔧 How to Apply These Changes

### 1. Update Dependencies (if needed)

```bash
npm install
```

### 2. Update Database Schema

```bash
# Generate Prisma client with new schema
npm run db:generate

# Push schema changes to database
npm run db:push
```

**Warning**: This will modify your database. If you have existing data, consider creating a migration instead:

```bash
npm run db:migrate
```

### 3. Restart Development Server

```bash
npm run dev
```

### 4. Test the New Features

#### Test Daily Login
```bash
curl -X POST http://localhost:3000/api/coins/daily-login \
  -H "Cookie: your-session-cookie"
```

#### Test Transaction History
```bash
curl http://localhost:3000/api/coins/history?limit=10
```

#### Test Deep Analysis Unlock
```bash
curl -X POST http://localhost:3000/api/claims/CLAIM_ID/unlock-analysis \
  -H "Cookie: your-session-cookie"
```

---

## 📊 How This Prepares for Phase 2

### Current State (Phase 1)
```
User creates account
  → +5 coins (logged in CreditEvent)
  → balanceBefore: 0, balanceAfter: 5

User votes on claim
  → -1 coin (logged in CreditEvent)
  → balanceBefore: 5, balanceAfter: 4
  → refType: "claim", refId: "claim_abc123"

User claims daily bonus
  → +2 coins (logged in CreditEvent)
  → idempotencyKey: "daily-login-user_xyz-2026-02-09"
  → Re-claiming same day returns same result
```

### Phase 2 (Pool Betting) - Easy Upgrade

The ledger infrastructure is **already in place**. Phase 2 just adds:

1. **Escrow on bet placement:**
   ```typescript
   // Already implemented in CoinService!
   escrowCoins(userId, marketId, 10)
   ```

2. **Settlement on resolution:**
   ```typescript
   // Add new transaction types:
   transferCoins({
     type: "STAKE_PAYOUT",
     amount: winnings,
     // Balance tracking automatically handled
   })
   ```

3. **House burn:**
   ```typescript
   transferCoins({
     type: "HOUSE_FEE_BURN",
     amount: -fee,
     // Creates burn record in ledger
   })
   ```

**No architectural changes needed** - just implement pool logic on top of existing ledger.

---

## 🔍 What's Still Missing (Future Phases)

### Phase 2 Features
- [ ] Parimutuel pool betting
- [ ] Payout formula implementation
- [ ] Actual house burn mechanism
- [ ] Conditional daily bonus (require activity)
- [ ] Reputation-based stake caps

### Phase 3 Features
- [ ] Claim proposal deposits
- [ ] Bounty/boost system
- [ ] Tournaments
- [ ] Seasonal leaderboards
- [ ] Economy monitoring dashboard

---

## 🐛 Troubleshooting

### "Prisma client not generated"
```bash
npm run db:generate
```

### "Column does not exist"
You need to push the schema changes:
```bash
npm run db:push
```

### "Insufficient credits" error
Check user balance and transaction history:
```typescript
import { getBalance, getCoinHistory } from "@/lib/coin-service";

const balance = await getBalance(userId);
const history = await getCoinHistory(userId, { limit: 10 });
```

### Daily login not working
Check for existing idempotency key:
```sql
SELECT * FROM "CreditEvent" 
WHERE "idempotencyKey" LIKE 'daily-login-USER_ID-%';
```

---

## 📈 Next Steps

1. **Test the ledger** - Create an account, earn/spend coins, check history
2. **Verify idempotency** - Try claiming daily bonus twice
3. **Monitor economy** - Track total supply, issuance rate
4. **Plan Phase 2** - Start designing pool betting UI

---

## 🎯 Key Takeaways

**What Changed:**
- Every coin movement now has a paper trail
- Can't accidentally double-credit users
- Daily rewards reduced to prevent inflation
- Better sink: "unlock analysis" vs "skip timer"

**What Stayed the Same:**
- Voting still costs 1 coin
- Signup bonus still 5 coins
- User experience largely unchanged

**What's Better:**
- Economy won't inflate out of control
- Admin can audit any transaction
- Ready for pool betting in Phase 2
- Clear migration path documented
