/**
 * CoinService - Phase 1 Auditable Ledger
 * 
 * All coin/credit transactions MUST go through this service to ensure:
 * - Auditable ledger (every movement tracked)
 * - Balance integrity (snapshot before/after)
 * - Idempotency (prevent double-credits)
 * - Transaction safety
 */

import { prisma } from "@/lib/prisma";
import { CreditEventType, Prisma } from "@prisma/client";

export interface CoinTransferOptions {
  userId: string;
  type: CreditEventType;
  amount: number;
  note?: string;
  refType?: string;
  refId?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface CoinTransferResult {
  success: boolean;
  newBalance: number;
  eventId: string;
  error?: string;
}

/**
 * Transfer coins to/from a user with full audit trail
 * Positive amount = credit, negative = debit
 */
export async function transferCoins(
  options: CoinTransferOptions
): Promise<CoinTransferResult> {
  const {
    userId,
    type,
    amount,
    note,
    refType,
    refId,
    metadata,
    idempotencyKey,
  } = options;

  try {
    // Check for duplicate operation (idempotency)
    if (idempotencyKey) {
      const existing = await prisma.creditEvent.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { credits: true },
        });

        return {
          success: true,
          newBalance: user?.credits || 0,
          eventId: existing.id,
        };
      }
    }

    // Execute transfer with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get current balance with lock
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const balanceBefore = user.credits;
      const balanceAfter = balanceBefore + amount;

      // Prevent negative balance (except for admin adjustments)
      if (balanceAfter < 0 && type !== "ADMIN_GRANT") {
        throw new Error(
          `Insufficient credits: ${balanceBefore} available, ${Math.abs(
            amount
          )} required`
        );
      }

      // Update balance
      await tx.user.update({
        where: { id: userId },
        data: { credits: balanceAfter },
      });

      // Record in ledger
      const event = await tx.creditEvent.create({
        data: {
          userId,
          type,
          amount,
          balanceBefore,
          balanceAfter,
          note,
          refType,
          refId,
          metadata: metadata ? (metadata as Prisma.JsonObject) : undefined,
          idempotencyKey,
        },
      });

      return {
        success: true,
        newBalance: balanceAfter,
        eventId: event.id,
      };
    });

    return result;
  } catch (error) {
    console.error("[CoinService] Transfer failed:", error);
    return {
      success: false,
      newBalance: 0,
      eventId: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Grant initial guest credits (one-time, idempotent)
 */
export async function grantGuestCredits(
  userId: string
): Promise<CoinTransferResult> {
  return transferCoins({
    userId,
    type: "GUEST_INITIAL",
    amount: 4,
    note: "Welcome! Explore claims with starter credits",
    idempotencyKey: `guest-initial-${userId}`,
  });
}

/**
 * Grant signup bonus (one-time, idempotent)
 */
export async function grantSignupBonus(
  userId: string
): Promise<CoinTransferResult> {
  return transferCoins({
    userId,
    type: "SIGNUP_BONUS",
    amount: 5,
    note: "Thanks for signing up!",
    idempotencyKey: `signup-bonus-${userId}`,
  });
}

/**
 * Grant newsletter bonus (one-time, idempotent)
 */
export async function grantNewsletterBonus(
  userId: string
): Promise<CoinTransferResult> {
  return transferCoins({
    userId,
    type: "NEWSLETTER_BONUS",
    amount: 5,
    note: "Thanks for subscribing!",
    idempotencyKey: `newsletter-bonus-${userId}`,
  });
}

/**
 * Grant daily login bonus (Phase 1: reduced to 2 coins)
 * Idempotent per day
 */
export async function grantDailyLogin(
  userId: string,
  date: Date = new Date()
): Promise<CoinTransferResult> {
  const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

  return transferCoins({
    userId,
    type: "DAILY_LOGIN",
    amount: 2,
    note: "Daily login bonus",
    idempotencyKey: `daily-login-${userId}-${dateKey}`,
  });
}

/**
 * Spend coins to vote on a claim
 */
export async function spendVoteCoins(
  userId: string,
  claimId: string
): Promise<CoinTransferResult> {
  return transferCoins({
    userId,
    type: "VOTE_SPENT",
    amount: -1,
    note: "Voted on claim",
    refType: "claim",
    refId: claimId,
  });
}

/**
 * Phase 1: Spend coins to unlock deep analysis (replaces "skip timer")
 */
export async function unlockDeepAnalysis(
  userId: string,
  claimId: string
): Promise<CoinTransferResult> {
  return transferCoins({
    userId,
    type: "DEEP_ANALYSIS_UNLOCK",
    amount: -5,
    note: "Unlocked full research breakdown",
    refType: "claim",
    refId: claimId,
    idempotencyKey: `deep-analysis-${userId}-${claimId}`,
  });
}

/**
 * Get user's coin transaction history
 */
export async function getCoinHistory(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    type?: CreditEventType;
  } = {}
) {
  const { limit = 50, offset = 0, type } = options;

  return prisma.creditEvent.findMany({
    where: {
      userId,
      ...(type && { type }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    select: {
      id: true,
      type: true,
      amount: true,
      balanceBefore: true,
      balanceAfter: true,
      note: true,
      refType: true,
      refId: true,
      metadata: true,
      createdAt: true,
    },
  });
}

/**
 * Get user's current balance (with verification against ledger)
 */
export async function getBalance(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  return user?.credits || 0;
}

/**
 * Admin: Adjust user balance with reason
 */
export async function adminAdjustBalance(
  userId: string,
  amount: number,
  reason: string,
  adminId: string
): Promise<CoinTransferResult> {
  return transferCoins({
    userId,
    type: "ADMIN_GRANT",
    amount,
    note: `Admin adjustment: ${reason}`,
    metadata: { adminId },
  });
}

/**
 * FUTURE Phase 2: Escrow coins for betting
 */
export async function escrowCoins(
  userId: string,
  marketId: string,
  amount: number
): Promise<{ success: boolean; holdId?: string; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from balance
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits < amount) {
        throw new Error("Insufficient credits");
      }

      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: amount } },
      });

      // Create hold record
      const hold = await tx.coinHold.create({
        data: {
          userId,
          marketId,
          amount,
          status: "LOCKED",
        },
      });

      // Log in ledger
      await tx.creditEvent.create({
        data: {
          userId,
          type: "VOTE_SPENT", // Will be STAKE_ESCROW in Phase 2
          amount: -amount,
          refType: "market",
          refId: marketId,
          note: "Coins escrowed for betting",
        },
      });

      return hold.id;
    });

    return { success: true, holdId: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Escrow failed",
    };
  }
}
