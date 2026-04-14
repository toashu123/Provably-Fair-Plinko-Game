import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/rounds/:id
 *
 * Returns the full round data.
 * ServerSeed is hidden until the round is REVEALED.
 */
export async function GET(
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

    // Hide serverSeed until revealed
    const response = {
      id: round.id,
      createdAt: round.createdAt,
      status: round.status,
      nonce: round.nonce,
      commitHex: round.commitHex,
      serverSeed: round.status === "REVEALED" ? round.serverSeed : null,
      clientSeed: round.clientSeed,
      combinedSeed: round.status === "REVEALED" ? round.combinedSeed : null,
      pegMapHash: round.pegMapHash,
      rows: round.rows,
      dropColumn: round.dropColumn,
      binIndex: round.binIndex,
      payoutMultiplier: round.payoutMultiplier,
      betCents: round.betCents,
      pathJson: round.pathJson,
      revealedAt: round.revealedAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[get round] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch round" },
      { status: 500 }
    );
  }
}
