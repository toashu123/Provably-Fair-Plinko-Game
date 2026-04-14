import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import VerifierFormWrapper from "./VerifierFormWrapper";

export const metadata: Metadata = {
  title: "Verify Round — Plinko Provably Fair",
  description:
    "Independently verify any Plinko round by entering the server seed, client seed, nonce, and drop column. Recomputes everything deterministically.",
};

export default function VerifyPage() {
  return (
    <>
      <header className="header">
        <div className="container">
          <div className="header-inner">
            <Link href="/" className="logo">
              ◉ Plinko
            </Link>
            <nav>
              <Link
                href="/"
                style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}
              >
                ← Back to Game
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          <div className="verify-layout">
            <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
              <h1
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-secondary), var(--color-primary))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  marginBottom: "var(--space-2)",
                }}
              >
                🔍 Round Verifier
              </h1>
              <p
                style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}
              >
                Enter the seeds below to independently recompute and verify any
                round. No trust required — all computations run on our server
                using the open-source algorithm.
              </p>
            </div>

            {/* Algorithm explanation */}
            <div
              className="card"
              style={{
                marginBottom: "var(--space-6)",
                background: "rgba(108,99,255,0.04)",
                borderColor: "rgba(108,99,255,0.15)",
              }}
            >
              <h3
                style={{
                  fontSize: "0.9rem",
                  marginBottom: "var(--space-3)",
                  color: "var(--color-primary)",
                }}
              >
                Verification Algorithm
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                  fontSize: "0.78rem",
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-mono)",
                  lineHeight: 1.8,
                }}
              >
                <div>
                  <span style={{ color: "var(--color-text-dim)" }}>1. </span>
                  commitHex = SHA256(serverSeed + &quot;:&quot; + nonce)
                </div>
                <div>
                  <span style={{ color: "var(--color-text-dim)" }}>2. </span>
                  combinedSeed = SHA256(serverSeed + &quot;:&quot; + clientSeed + &quot;:&quot; + nonce)
                </div>
                <div>
                  <span style={{ color: "var(--color-text-dim)" }}>3. </span>
                  PRNG seed = first 4 bytes of combinedSeed (big-endian uint32)
                </div>
                <div>
                  <span style={{ color: "var(--color-text-dim)" }}>4. </span>
                  Build peg map using XorShift32 (12 rows × triangle pegs)
                </div>
                <div>
                  <span style={{ color: "var(--color-text-dim)" }}>5. </span>
                  Simulate ball drop with dropColumn bias adjustment
                </div>
                <div>
                  <span style={{ color: "var(--color-text-dim)" }}>6. </span>
                  binIndex = count of RIGHT moves
                </div>
              </div>
            </div>

            <Suspense fallback={<div className="card" style={{textAlign:'center', padding:'var(--space-8)', color:'var(--color-text-muted)'}}>Loading…</div>}>
              <VerifierFormWrapper />
            </Suspense>
          </div>
        </div>
      </main>
    </>
  );
}
