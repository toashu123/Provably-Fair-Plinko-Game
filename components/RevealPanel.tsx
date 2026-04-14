"use client";
import { useRouter } from "next/navigation";
import type { RevealResult, StartResult } from "@/hooks/useGameState";
import { PAYOUT_MULTIPLIERS } from "@/lib/engine/payouts";

interface RevealPanelProps {
  revealResult: RevealResult | null;
  startResult: StartResult | null;
  betAmount: number;
}

function binColor(mult: number): string {
  if (mult >= 10) return "#ff4444";
  if (mult >= 4) return "#ff8c00";
  if (mult >= 2) return "#ffd700";
  if (mult >= 1) return "#44dd88";
  return "#6c63ff";
}

export default function RevealPanel({
  revealResult,
  startResult,
  betAmount,
}: RevealPanelProps) {
  const router = useRouter();

  if (!revealResult || !startResult) return null;

  const mult = revealResult.payoutMultiplier;
  const winnings = Math.floor(betAmount * mult);
  const profit = winnings - betAmount;
  const isWin = profit > 0;
  const color = binColor(mult);

  const verifyUrl = `/verify?serverSeed=${encodeURIComponent(
    revealResult.serverSeed
  )}&clientSeed=${encodeURIComponent(
    revealResult.clientSeed
  )}&nonce=${encodeURIComponent(
    revealResult.nonce
  )}&dropColumn=${revealResult.dropColumn}`;

  return (
    <div
      className="card animate-fade-in"
      style={{
        borderColor: `${color}44`,
        boxShadow: `0 0 30px ${color}22`,
        padding: "var(--space-5)",
      }}
    >
      {/* Result header */}
      <div style={{ textAlign: "center", marginBottom: "var(--space-5)" }}>
        <div
          className="multiplier-win"
          style={{ color, marginBottom: "var(--space-2)" }}
        >
          {mult}×
        </div>
        <div
          style={{
            fontSize: "1.4rem",
            fontWeight: 800,
            color: isWin ? "var(--color-secondary)" : "var(--color-accent)",
          }}
        >
          {isWin ? "+" : ""}
          {profit} units
        </div>
        <div style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
          Bin #{revealResult.binIndex} &nbsp;·&nbsp; Payout: {winnings} units
        </div>
      </div>

      {/* Path display */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <div className="label">Path</div>
        <div
          style={{
            display: "flex",
            gap: "4px",
            flexWrap: "wrap",
            marginTop: "4px",
          }}
        >
          {startResult.path.map((move, i) => (
            <span
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "22px",
                height: "22px",
                borderRadius: "4px",
                fontSize: "0.7rem",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                background:
                  move === "R"
                    ? "rgba(108,99,255,0.2)"
                    : "rgba(0,212,170,0.15)",
                color: move === "R" ? "var(--color-primary)" : "var(--color-secondary)",
                border: `1px solid ${move === "R" ? "rgba(108,99,255,0.3)" : "rgba(0,212,170,0.25)"}`,
              }}
            >
              {move}
            </span>
          ))}
        </div>
      </div>

      {/* Bin row */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <div className="label">Bin Index</div>
        <div style={{ display: "flex", gap: "2px", marginTop: "4px" }}>
          {PAYOUT_MULTIPLIERS.map((m, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: "24px",
                borderRadius: "3px",
                background:
                  i === revealResult.binIndex
                    ? binColor(m)
                    : `${binColor(m)}22`,
                border: `1px solid ${binColor(m)}44`,
                boxShadow:
                  i === revealResult.binIndex
                    ? `0 0 10px ${binColor(m)}88`
                    : "none",
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.65rem",
            color: "var(--color-text-dim)",
            marginTop: "2px",
          }}
        >
          <span>0</span>
          <span>6</span>
          <span>12</span>
        </div>
      </div>

      {/* Revealed cryptographic info */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          marginBottom: "var(--space-4)",
        }}
      >
        <RevealField label="Server Seed (revealed)" value={revealResult.serverSeed} />
        <RevealField label="Combined Seed" value={revealResult.combinedSeed ?? ""} />
        <RevealField label="Peg Map Hash" value={revealResult.pegMapHash ?? ""} />
      </div>

      {/* Verify button */}
      <button
        className="btn btn-secondary w-full"
        onClick={() => router.push(verifyUrl)}
        id="verify-round-btn"
      >
        🔍 Verify This Round
      </button>
    </div>
  );
}

function RevealField({ label, value }: { label: string; value: string }) {
  const copy = () => navigator.clipboard.writeText(value);
  return (
    <div>
      <div className="label">{label}</div>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <div
          className="code-block"
          style={{ flex: 1, fontSize: "0.68rem" }}
          title={value}
        >
          {value.slice(0, 24)}…{value.slice(-8)}
        </div>
        <button className="btn btn-icon" onClick={copy} title="Copy">
          📋
        </button>
      </div>
    </div>
  );
}
