import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/rounds/:id/reveal
 *
 * Reveals the serverSeed for a STARTED round, completing the commit-reveal scheme.
 * After reveal, players can verify the round independently.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const round = await prisma.round.findUnique({
      where: { id: params.id },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    if (round.status !== "STARTED") {
      return NextResponse.json(
        { error: `Round must be in STARTED status to reveal. Current: ${round.status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.round.update({
      where: { id: round.id },
      data: {
        status: "REVEALED",
        revealedAt: new Date(),
      },
    });

    return NextResponse.json({
      serverSeed: updated.serverSeed,
      combinedSeed: updated.combinedSeed,
      commitHex: updated.commitHex,
      nonce: updated.nonce,
      clientSeed: updated.clientSeed,
      pegMapHash: updated.pegMapHash,
      binIndex: updated.binIndex,
      payoutMultiplier: updated.payoutMultiplier,
      dropColumn: updated.dropColumn,
      revealedAt: updated.revealedAt,
    });
  } catch (error) {
    console.error("[reveal] Error:", error);
    return NextResponse.json(
      { error: "Failed to reveal round" },
      { status: 500 }
    );
  }
}
