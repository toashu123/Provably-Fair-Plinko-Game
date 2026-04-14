import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeAll } from "@/lib/engine/plinko";

export const dynamic = "force-dynamic";

/**
 * POST /api/rounds/:id/start
 *
 * Body: { clientSeed: string, betCents: number, dropColumn: number }
 *
 * Runs the deterministic engine and stores results.
 * Returns: { pegMapHash, rows, path, binIndex, payoutMultiplier }
 *
 * Does NOT reveal the serverSeed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const round = await prisma.round.findUnique({
      where: { id: params.id },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    if (round.status !== "COMMITTED") {
      return NextResponse.json(
        { error: `Round is already in status: ${round.status}` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { clientSeed, betCents, dropColumn } = body as {
      clientSeed: string;
      betCents: number;
      dropColumn: number;
    };

    if (!clientSeed || typeof betCents !== "number" || typeof dropColumn !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: clientSeed, betCents, dropColumn" },
        { status: 400 }
      );
    }

    if (dropColumn < 0 || dropColumn > 12) {
      return NextResponse.json(
        { error: "dropColumn must be between 0 and 12" },
        { status: 400 }
      );
    }

    if (betCents <= 0) {
      return NextResponse.json(
        { error: "betCents must be positive" },
        { status: 400 }
      );
    }

    // Run the deterministic engine
    const result = computeAll(
      round.serverSeed,
      clientSeed,
      round.nonce,
      dropColumn,
      round.rows
    );

    // Persist results (still not revealing serverSeed to client)
    await prisma.round.update({
      where: { id: round.id },
      data: {
        status: "STARTED",
        clientSeed,
        betCents,
        dropColumn,
        combinedSeed: result.combinedSeed,
        pegMapHash: result.pegMapHash,
        binIndex: result.binIndex,
        payoutMultiplier: result.payoutMultiplier,
        pathJson: JSON.stringify(result.path),
      },
    });

    return NextResponse.json({
      pegMapHash: result.pegMapHash,
      rows: round.rows,
      path: result.path,
      binIndex: result.binIndex,
      payoutMultiplier: result.payoutMultiplier,
      combinedSeed: result.combinedSeed,
    });
  } catch (error) {
    console.error("[start] Error:", error);
    return NextResponse.json(
      { error: "Failed to start round" },
      { status: 500 }
    );
  }
}
