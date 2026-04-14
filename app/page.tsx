"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import PlinkoBoard from "@/components/PlinkoBoard";
import GameControls from "@/components/GameControls";
import RoundInfo from "@/components/RoundInfo";
import RevealPanel from "@/components/RevealPanel";
import Confetti from "@/components/Confetti";
import { useGameState } from "@/hooks/useGameState";
import { useSound } from "@/hooks/useSound";
import { useKeyboard } from "@/hooks/useKeyboard";

export default function GamePage() {
  const game = useGameState();
  const sound = useSound();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isTilt, setIsTilt] = useState(false);
  const [isDungeon, setIsDungeon] = useState(false);
  const pendingReveal = useRef(false);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Sync mute state to sound hook
  useEffect(() => {
    sound.setMuted(game.muted);
  }, [game.muted, sound]);

  // When drop completes (startResult arrives), start animation
  useEffect(() => {
    if (game.phase === "DROPPING" && game.startResult) {
      setIsAnimating(true);
      pendingReveal.current = true;
    }
  }, [game.phase, game.startResult]);

  // Animation complete → auto-reveal
  const handleAnimationComplete = useCallback(async () => {
    setIsAnimating(false);
    if (pendingReveal.current) {
      pendingReveal.current = false;
      await game.revealRound();
    }
  }, [game]);

  // Show confetti on win
  useEffect(() => {
    if (game.phase === "REVEALED" && game.revealResult) {
      const profit =
        Math.floor(game.betAmount * game.revealResult.payoutMultiplier) -
        game.betAmount;
      if (profit > 0) {
        sound.playWin();
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      } else {
        sound.playLose();
      }
    }
  }, [game.phase, game.revealResult, game.betAmount, sound]);

  // Keyboard controls
  useKeyboard({
    onLeft: game.moveLeft,
    onRight: game.moveRight,
    onDrop: useCallback(() => {
      if (game.phase === "COMMITTED") game.dropBall();
    }, [game]),
    onTilt: useCallback(() => {
      setIsTilt((v) => !v);
    }, []),
    onThemeToggle: useCallback(() => {
      setIsDungeon((v) => !v);
    }, []),
    enabled: !isAnimating,
  });

  // Apply Dungeon Theme to body
  useEffect(() => {
    if (isDungeon) {
      document.body.classList.add("theme-dungeon");
    } else {
      document.body.classList.remove("theme-dungeon");
    }
  }, [isDungeon]);

  // Peg tick callback
  const handlePegTick = useCallback(() => {
    sound.playTick();
  }, [sound]);

  return (
    <>
      <Confetti active={showConfetti} />

      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-inner">
            <div className="logo">◉ Plinko</div>
            <nav style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-muted)",
                  background: "var(--color-surface-2)",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--color-border)",
                }}
              >
                🔒 Provably Fair
              </span>
              <Link
                href="/verify"
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                🔍 Verify
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="main-content">
        <div className="container">
          {/* Page title */}
          <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
            <h1
              style={{
                background:
                  "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                marginBottom: "var(--space-2)",
              }}
            >
              Provably Fair Plinko
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
              Every outcome is cryptographically verifiable. Drop the ball.
              Trust the math.
            </p>
          </div>

          {/* Error bar */}
          {game.error && (
            <div
              className="animate-fade-in"
              style={{
                background: "rgba(255,107,107,0.1)",
                border: "1px solid rgba(255,107,107,0.3)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3) var(--space-4)",
                color: "var(--color-accent)",
                fontSize: "0.85rem",
                marginBottom: "var(--space-4)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              ⚠ {game.error}
            </div>
          )}

          {/* Game grid */}
          <div className={`game-layout ${isTilt ? "tilt-active" : ""}`}>
            {/* Left panel: controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <GameControls
                phase={game.phase}
                balance={game.balance}
                betAmount={game.betAmount}
                dropColumn={game.dropColumn}
                clientSeed={game.clientSeed}
                muted={game.muted}
                onCommit={game.commitRound}
                onDrop={game.dropBall}
                onReveal={game.revealRound}
                onReset={game.reset}
                onBetChange={game.setBetAmount}
                onDropColumnChange={game.setDropColumn}
                onClientSeedChange={game.setClientSeed}
                onMuteToggle={() => game.setMuted(!game.muted)}
              />
            </div>

            {/* Right panel: board + info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <PlinkoBoard
                path={game.startResult?.path ?? null}
                binIndex={game.startResult?.binIndex ?? null}
                dropColumn={game.dropColumn}
                isAnimating={isAnimating}
                onAnimationComplete={handleAnimationComplete}
                onPegTick={handlePegTick}
                reducedMotion={reducedMotion}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: game.revealResult ? "1fr 1fr" : "1fr",
                  gap: "var(--space-4)",
                }}
              >
                <RoundInfo round={game.round} phase={game.phase} />
                {game.phase === "REVEALED" && game.revealResult && (
                  <RevealPanel
                    revealResult={game.revealResult}
                    startResult={game.startResult}
                    betAmount={game.betAmount}
                  />
                )}
              </div>
            </div>
          </div>

          {/* How it works */}
          <div
            style={{
              marginTop: "var(--space-16)",
              padding: "var(--space-8)",
              background: "var(--color-surface)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--color-border)",
            }}
          >
            <h2 style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
              How It Works
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "var(--space-6)",
              }}
            >
              {[
                {
                  icon: "🔒",
                  title: "1. Commit",
                  desc: "Server locks in a secret seed and publishes commitHex = SHA-256(seed:nonce). You can see this before playing.",
                },
                {
                  icon: "🎯",
                  title: "2. Play",
                  desc: "You provide a client seed. The ball path is determined by SHA-256(serverSeed:clientSeed:nonce) — before the server knows your seed.",
                },
                {
                  icon: "🔓",
                  title: "3. Reveal",
                  desc: "After the round, the server reveals the full seed. Verify commitHex matches, then recompute the path yourself.",
                },
                {
                  icon: "✅",
                  title: "4. Verify",
                  desc: "Paste seeds into the Verifier page. It recomputes everything client-side — no trust required.",
                },
              ].map((step) => (
                <div
                  key={step.title}
                  style={{
                    textAlign: "center",
                    padding: "var(--space-4)",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "var(--space-3)" }}>
                    {step.icon}
                  </div>
                  <h3 style={{ fontSize: "1rem", marginBottom: "var(--space-2)" }}>
                    {step.title}
                  </h3>
                  <p
                    style={{
                      color: "var(--color-text-muted)",
                      fontSize: "0.82rem",
                      lineHeight: 1.6,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
