import { NextRequest, NextResponse } from "next/server";
import { computeAll } from "@/lib/engine/plinko";

export const dynamic = "force-dynamic";

/**
 * GET /api/verify?serverSeed=&clientSeed=&nonce=&dropColumn=
 *
 * Recomputes everything deterministically given the four inputs.
 * Returns all derived values so the client can independently verify a round.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverSeed = searchParams.get("serverSeed") ?? "";
    const clientSeed = searchParams.get("clientSeed") ?? "";
    const nonce = searchParams.get("nonce") ?? "";
    const dropColumnStr = searchParams.get("dropColumn") ?? "6";
    const dropColumn = parseInt(dropColumnStr, 10);

    if (!serverSeed || !clientSeed || !nonce) {
      return NextResponse.json(
        { error: "Required: serverSeed, clientSeed, nonce" },
        { status: 400 }
      );
    }

    if (isNaN(dropColumn) || dropColumn < 0 || dropColumn > 12) {
      return NextResponse.json(
        { error: "dropColumn must be 0..12" },
        { status: 400 }
      );
    }

    const result = computeAll(serverSeed, clientSeed, nonce, dropColumn);

    return NextResponse.json({
      commitHex: result.commitHex,
      combinedSeed: result.combinedSeed,
      pegMapHash: result.pegMapHash,
      binIndex: result.binIndex,
      payoutMultiplier: result.payoutMultiplier,
      path: result.path,
    });
  } catch (error) {
    console.error("[verify] Error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
