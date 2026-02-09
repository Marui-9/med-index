import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCoinHistory } from "@/lib/coin-service";

/**
 * GET /api/coins/history
 * 
 * Get user's coin transaction history
 * Query params: limit, offset, type
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const type = searchParams.get("type") || undefined;

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
