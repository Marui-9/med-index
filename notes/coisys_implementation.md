Implementation steps for the coin system
1) Define your economy spec (one page, versioned)

Create a single source-of-truth document (e.g., /docs/economy-v1.md) that states:

Coin unit (coin vs micro-coin, rounding rules)

House fee/burn rate (e.g., 3%)

Onboarding grant (e.g., 20 coins once)

Daily stipend rule (if any; recommended “conditional”)

Stake limits by reputation tier

Allowed sinks (what coins can be spent on)

Anti-abuse constraints (rate limits, caps)

This doc prevents “silent” changes that break trust.

References:

Parimutuel/pool betting mechanics (deduct fee, distribute pool to winners).

2) Build a coin ledger (do not store only “balance”)

Implement a double-entry style ledger so every coin movement is auditable.

Tables (minimum)

users(id, coin_balance, rep_score, created_at, …)

coin_ledger(id, user_id, type, amount, ref_type, ref_id, created_at)

coin_hold(id, user_id, market_id, amount, status) (escrowed stakes)

Rules

All coin changes happen through one service (e.g., CoinService.transfer()).

Enforce idempotency keys for payouts/resolutions to avoid double-paying.

Example ledger types

ONBOARD_GRANT, DAILY_STIPEND

STAKE_ESCROW, STAKE_RELEASE_WIN, STAKE_LOSS

HOUSE_FEE_BURN

CLAIM_PROPOSAL_DEPOSIT, CLAIM_DEPOSIT_REFUND, CLAIM_DEPOSIT_BURN

BOUNTY_CONTRIBUTION, BOUNTY_PAYOUT

TOURNAMENT_ENTRY, TOURNAMENT_PAYOUT

3) Implement markets as parimutuel pools (YES/NO)

Each claim is a market with two pooled totals.

Tables

markets(id, title, status, closes_at, resolves_at, outcome, fee_rate, …)

market_pool(market_id, yes_total, no_total)

market_bets(id, market_id, user_id, side, stake_amount, created_at)

On bet placement

Validate stake within caps (per-user and per-market).

Deduct coins from user balance and place in escrow (coin_hold).

Increase yes_total or no_total.

Display implied odds (optional but motivating)

p_yes = yes_total / (yes_total + no_total)

p_no = 1 - p_yes

4) Define the payout formula and rounding (document it)

Use standard parimutuel: deduct fee, distribute remainder to winners pro-rata.

Let:

Y = yes_total, N = no_total, T = Y + N

fee = fee_rate (e.g., 0.03)

winning pool W = Y if outcome YES else N

Payout per 1 coin staked on the winning side

payout_per_coin = (T * (1 - fee)) / W

User payout

user_payout = user_stake * payout_per_coin

Example

YES pool Y=120, NO pool N=80, total T=200, fee 3%

Outcome = YES → W=120

payout_per_coin = (200 * 0.97) / 120 = 194 / 120 = 1.616666…

User stakes 10 on YES → payout = 16.1666… coins (includes stake)

Rounding

Store in micro-coins (e.g., 1 coin = 1000 units), then round only for display.

If you must use integers only: floor payouts and send remainder to HOUSE_FEE_BURN or a “rounding bucket” (make it explicit in the economy doc).

5) Implement resolution + settlement as an atomic job

Create a single settlement job that is idempotent and transactional.

Resolution inputs

outcome (YES/NO)

evidence write-up + citations + rubric outcome (stored for transparency)

Settlement algorithm

Lock market row (SELECT … FOR UPDATE)

Compute T, W, payout_per_coin

For each bet on winning side:

release escrow and credit user_payout

For each bet on losing side:

escrow is forfeited (no credit)

Record HOUSE_FEE_BURN amount

Mark market status=RESOLVED, store settlement summary + hash

6) Replace “skip timer” with “early access / deep dive unlock”

Make the free experience trustworthy, and the paid experience richer.

Free (always)

Verdict + short rationale (3 bullets)

Top sources list

“Not medical advice” banner

Coins unlock

Full write-up (methods, extraction notes, effect size summaries where applicable)

“What would change the verdict”

Advanced filters and personal history views

This creates a sink without feeling like a paywall on the core truth claim.

7) Add coin sinks that users want

Implement these in order (highest retention impact first):

7.1 Claim proposal deposit

Cost: e.g., 10 coins to propose a claim

Refund if accepted (and well-formed); partial burn if rejected as duplicate/low-quality

7.2 Claim boost / bounty pool

Any user can add coins to a bounty for faster review or better write-up

On resolution, distribute bounty by policy (example):

70% to correct bettors (pro-rata)

30% to validated evidence contributors

Or burn a portion to fight inflation

7.3 Tournaments / events

Entry fee → prize pool (minus burn)

Weekly or seasonal events drive return visits

8) Redesign coin earning: performance-first, minimal faucet

8.1 Onboarding

Grant a one-time starter pack (enough to feel the game): e.g., 20 coins.

8.2 Daily stipend (optional, recommended conditional)

“Claim 1 coin/day after placing at least one stake in the last 24h.”

Avoid large passive giveaways; they destroy coin value.

8.3 Evidence contribution rewards (curated)

Users submit citations/rationales.

Only pay if:

a resolver includes the source in the final write-up, or

high-rep reviewers approve it.

Hard cap per market (e.g., max 10 coins total to contributors) to prevent spam.

9) Implement reputation + forecasting score (separate from coins)

Coins motivate activity; reputation motivates quality and privileges.

If you support probabilities (recommended)

Use Brier score for binary outcomes.

BS = (f - o)^2 averaged over events

Lower is better; convert to a “skill score” for UI (e.g., Skill = 100 - 100*BS)

If you only support YES/NO

Use accuracy weighted by market difficulty (e.g., crowd implied probability at bet time):

Reward being right when the market probability was low.

Privileges gated by reputation

Higher max stake

Can propose claims with smaller deposit

Can review evidence / approve contributions

Can participate in high-visibility tournaments

10) Build leaderboards that reward quality (seasonal)

Leaderboards are worth having if they measure skill, not volume.

Implement

Seasons (4–8 weeks), with resets and permanent badges

Minimum sample sizes to qualify (e.g., ≥20 resolved bets)

Boards (recommended)

Skill (calibration/accuracy)

ROI (coin growth from staking; requires min bets)

Upsets called (wins against strong odds)

Evidence contributor (only curated rewards)

Avoid “most bets placed”.

11) Add Elo only for duels/arena mode (optional)

Elo is best for head-to-head.

Arena flow

Two users take opposite sides with equal stakes on a claim (or dedicated duel prompts)

Winner gains Elo, loser loses Elo

Elo basics

Expected score: E = 1 / (1 + 10^((Rb - Ra)/400))

Update: R'a = Ra + K*(Sa - E) (choose K, e.g., 16–32)

Keep Elo separate from the main “forecasting skill” metric to avoid confusing signals.

12) Add anti-abuse controls before launch

Minimum viable controls:

Stake caps for new accounts (e.g., max 3 coins/market until 10 resolved bets)

Rate limit claim proposals and evidence submissions

Duplicate-claim detection

Basic sybil friction (email/phone verification to unlock high-impact actions)

Anomaly flags (many accounts from same device/IP, coordinated betting)

13) FOR ADMIN: Add economy monitoring and tuning dashboards

Track:

Total coin supply in circulation

Daily issuance (onboarding + stipends + bonuses)

Daily burn (fees + deposit burns + rounding bucket)

Average stake per market

Concentration (top 1% coin holders)

Retention by cohort (especially bettors vs non-bettors)

Use this to tune: fee rate, faucet size, deposit sizes, stake caps.

Implementation order (recommended)

Ledger + escrow + markets + settlement (Steps 2–5)

Sinks: stakes + proposal deposit + deep writeups (Steps 6–7)

Reputation + seasonal leaderboards (Steps 9–10)

Evidence rewards + bounties (Step 8.3 + 7.2)

Arena/Elo mode (Step 11)

Continuous anti-abuse + monitoring (Steps 12–13)
