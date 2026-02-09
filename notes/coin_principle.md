Assessment of the previously outlined system
It is directionally correct (coins must be scarce, stakes must matter, rewards must come from being right, seasons/leaderboards help), but it is missing one structural element that makes coins feel “real” in virtual prediction games:
Coins must circulate between users via a clear win/lose mechanic (pool/odds), and there must be strong sinks that don’t depend on arbitrary timers.
If coins mostly come from logins and are mostly spent to “skip,” they will not feel valuable and retention will skew toward farming, not forecasting.
What follows is a redesign that maximizes user value: (1) fast, satisfying payoff, (2) visible skill/status, (3) useful evidence summaries, (4) a stable coin economy.

Proposed coin system (high-level)
Design goals (what creates customer value)


I can profit in-app by being right (immediate, tangible feedback).


I can’t mindlessly bet on everything (scarcity creates meaning).


Outcomes feel fair (transparent odds/payout, clear resolution rubric).


My skill is visible and comparable (leaderboards that reward quality).


There’s always something new to do (cadence + seasons + events).



1) Two-track system: Coins + Reputation
Coins (spendable)
Used for staking, entering events, proposing/boosting claims, unlocking deeper write-ups.
Reputation (non-spendable)
Used for trust/privileges:


higher max stake caps


ability to submit claims without heavy deposits


ability to review/flag evidence


eligibility for “resolver/reviewer” roles


This prevents “rich but low-skill” users from dominating and makes skill matter.

2) Betting and payouts (the core of coin value)
Use a pool-based payout (simple, compelling, and inflation-resistant)
For each claim, users stake coins on Yes or No. When it resolves:


The losing pool is distributed to winners pro-rata (minus a small fee/burn).


This makes being right the main way to grow coins.


It also makes “being contrarian (and right)” more rewarding automatically.


Payout formula (parimutuel):


Let W = total coins staked on winning side


Let L = total coins staked on losing side


User stake = s on winning side
User receives: s + s*(L/W) (then apply fee)


Add a small “house burn” to create scarcity
Take 2–5% of winnings (or of the total pool) and remove it from circulation.


This makes coins gradually scarce, increasing perceived value.


It also funds anti-inflation if you have any faucet.


Optional (better skill measurement): add a confidence slider
Let users pick Low / Med / High confidence (maps to probabilities like 60/75/90).


This improves reputation scoring (calibration), without making betting complex.



3) Coin earning methods (avoid passive farming)
Primary earnings (skill-based)


Win payouts (from the losing pool).


Upset bonus (small, optional): if you were correct against strong crowd odds, add a tiny extra reward (from a system “bonus pool” with strict caps).


Secondary earnings (contribution-based; must be curated)


Evidence contribution rewards




Users can attach citations/rationales.


Only citations that are actually used in the final write-up (or upvoted by high-rep reviewers) earn coins.


Hard caps per claim prevent spam.


Minimal faucet (optional; keep small and conditional)


Daily stipend should be small (e.g., 1 coin/day) and ideally conditional:




“Claim your daily coin after placing 1 forecast” (prevents pure check-in farming).


Cap streak bonuses tightly.


Onboarding grant
Give enough to try the game, not enough to ignore outcomes:


Example: 20 coins once (lets someone place 10–20 small stakes).



4) Coin spending (strong sinks that users want)
Coins must buy meaningful capabilities/status, not just “skip time.”
Core sinks


Stakes (coins at risk; main sink/redistribution mechanism).


Claim proposal deposit




Example: 10 coins to propose a claim (refunded if accepted and well-formed).


If rejected (duplicate/low quality), deposit is partially burned.




Boost/bounty a claim




Users can add coins to a “bounty pool” to prioritize a claim or attract evidence contributions.


On resolution, the bounty is distributed (e.g., 70% to correct bettors, 30% to top evidence contributors) or burned partially.




Tournaments / seasonal events entry




Entry fee goes into a prize pool (plus small burn).


This is a powerful sink that also drives retention.


“Nice-to-have” sinks (do not harm trust)


Deep write-ups and tooling




Free: verdict + short rationale + top sources.


Paid: full extraction notes, “what would change the verdict,” evidence grading breakdown, advanced filters, export, personal calibration dashboard.




Cosmetics/status
Badges, profile frames, titles—small but effective sinks.


Remove/replace “skip the timer”
Replace with:


“Early access to full write-up” (doesn’t feel like pay-to-skip an arbitrary delay).


Or scheduled drops (daily) so waiting feels legitimate.



5) Leaderboards and Elo: what to use
Leaderboards are worth having (strong retention lever) if designed well
Use seasons (4–8 weeks) and multiple boards:
Recommended boards


Skill (primary): calibration/accuracy score (weighted by confidence or by odds at time of bet)


ROI (secondary): coin growth from staking (with minimum activity threshold)


Upsets called


Evidence contributor (only if rewards are curated)


Guardrails


Require minimum number of resolved bets to appear.


Separate “Rookie” board (new accounts).


Category boards (supplements, dieting, fitness myths) to keep it accessible.


Elo: useful only in a specific mode
Elo is worth it if you add head-to-head duels or “arena mode”:


Two users take opposite sides with equal stakes.


Elo changes based on outcome.


Do not use Elo as your primary score for open claims; it’s not naturally aligned with forecasting quality.
Recommendation:


Primary: forecasting skill score (calibration/accuracy) + ROI


Elo: only for duels/tournaments



6) Retention loop (what keeps non-money users coming back)


Predict (stakes feel meaningful)


Daily/biweekly resolution drops (predictable payoff)


Immediate result feedback (coins + reputation + “upset” highlights)


Social proof (leaderboards, receipts, shareable cards)


Seasonal resets + events (fresh competition)


Personal relevance (follow topics; tailored feed)



Bottom line: is there a better way than the earlier outline?
Yes: the earlier outline becomes significantly stronger if you make the economy pool-based/odds-based, remove large passive faucets, and add claim proposal/bounty/tournament sinks. That combination:


makes coins scarce and useful,


makes betting intrinsically rewarding,


creates repeated “win/loss moments,”


and provides multiple retention hooks without real-money payouts.


If you want, I can provide a concrete “v1 numbers” spec (starter coins, daily stipend, burn %, stake caps, proposal deposit, bounty split, tournament cadence) that keeps the economy stable and hard to game.
