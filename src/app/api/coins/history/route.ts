import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCoinHistory } from "@/lib/coin-service";
import { readLimiter } from "@/lib/rate-limit";

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.string().max(50).optional(),
});

/**
 * GET /api/coins/history
 *
 * Get user's coin transaction history
 * Query params: limit, offset, type
 */
export async function GET(request: NextRequest) {
  const limited = readLimiter.check(request);
  if (limited) return limited;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = historyQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { limit, offset, type } = parsed.data;

    const history = await getCoinHistory(session.user.id, {
      limit,
      offset,
      type: type as any,
    });

    return NextResponse.json({
      success: true,
      transactions: history,
      count: history.length,
    });
  } catch (error) {
    console.error("[Coin History] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch coin history" },
      { status: 500 }
    );
  }
}
