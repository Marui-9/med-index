import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { grantDailyLogin } from "@/lib/coin-service";
import { prisma } from "@/lib/prisma";
import { actionLimiter } from "@/lib/rate-limit";

/**
 * POST /api/coins/daily-login
 *
 * Claim daily login bonus (Phase 1: 2 coins)
 * - Idempotent (one claim per day)
 * - Updates lastLoginDate for streak tracking (future)
 */
export async function POST(request: NextRequest) {
  const limited = actionLimiter.check(request);
  if (limited) return limited;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const today = new Date();

    // Grant daily login bonus (idempotent per day)
    const coinResult = await grantDailyLogin(userId, today);

    if (!coinResult.success) {
      // Already claimed today (idempotency key exists)
      return NextResponse.json(
        {
          success: false,
          message: "Daily bonus already claimed",
          balance: coinResult.newBalance,
        },
        { status: 200 }
      );
    }

    // Update lastLoginDate for streak tracking (future feature)
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginDate: today },
    });

    return NextResponse.json({
      success: true,
      message: "Daily bonus claimed! +2 coins",
      coinsEarned: 2,
      newBalance: coinResult.newBalance,
    });
  } catch (error) {
    console.error("[Daily Login] Error:", error);
    return NextResponse.json(
      { error: "Failed to claim daily bonus" },
      { status: 500 }
    );
  }
}
