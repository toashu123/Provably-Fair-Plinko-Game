import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateServerSeed,
  generateNonce,
  buildCommitHex,
} from "@/lib/crypto/hash";

export const dynamic = "force-dynamic";

/**
 * POST /api/rounds/commit
 *
 * Creates a new round with a server seed and nonce.
 * Returns the commitHex (SHA256 of serverSeed:nonce) to the client.
 * The serverSeed is stored in DB but NOT returned here.
 */
export async function POST() {
  try {
    const serverSeed = generateServerSeed();
    const nonce = generateNonce();
    const commitHex = buildCommitHex(serverSeed, nonce);

    const round = await prisma.round.create({
      data: {
        serverSeed,
        nonce,
        commitHex,
        status: "COMMITTED",
        rows: 12,
      },
    });

    return NextResponse.json(
      {
        roundId: round.id,
        commitHex: round.commitHex,
        nonce: round.nonce,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[commit] Error:", error);
    return NextResponse.json(
      { error: "Failed to create round" },
      { status: 500 }
    );
  }
}
