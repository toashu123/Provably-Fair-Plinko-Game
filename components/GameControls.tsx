"use client";
import { useState, useCallback } from "react";
import type { GamePhase } from "@/hooks/useGameState";

interface GameControlsProps {
  phase: GamePhase;
  balance: number;
  betAmount: number;
  dropColumn: number;
  clientSeed: string;
  muted: boolean;
  onCommit: () => void;
  onDrop: () => void;
  onReveal: () => void;
  onReset: () => void;
  onBetChange: (val: number) => void;
  onDropColumnChange: (val: number) => void;
  onClientSeedChange: (val: string) => void;
  onMuteToggle: () => void;
}

const BINS = 13;
const MAX_BET = 500;
const QUICK_BETS = [5, 10, 25, 50, 100];

export default function GameControls({
  phase,
  balance,
  betAmount,
  dropColumn,
  clientSeed,
  muted,
  onCommit,
  onDrop,
  onReveal,
  onReset,
  onBetChange,
  onDropColumnChange,
  onClientSeedChange,
  onMuteToggle,
}: GameControlsProps) {
  const canCommit = phase === "IDLE" || phase === "REVEALED" || phase === "ERROR";
  const showCommitBtn = canCommit || phase === "COMMITTING";
  const canDrop = phase === "COMMITTED";
  const canReveal = phase === "DROPPING";
  const isLoading =
    phase === "COMMITTING" || phase === "DROPPING";

  const halfBet = useCallback(
    () => onBetChange(Math.max(1, Math.floor(betAmount / 2))),
    [betAmount, onBetChange]
  );
  const doubleBet = useCallback(
    () => onBetChange(Math.min(MAX_BET, betAmount * 2)),
    [betAmount, onBetChange]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      {/* Balance */}
      <div className="balance-display">
        <div>
          <div className="balance-label">Balance</div>
          <div className="balance-amount">
            {balance.toLocaleString()}{" "}
            <span style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>units</span>
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button
            className="btn-icon btn"
            onClick={onMuteToggle}
            title={muted ? "Unmute" : "Mute"}
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>

      {/* Bet Amount */}
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <div className="form-group">
          <label className="label">Bet Amount</label>
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <button className="btn btn-secondary btn-sm" onClick={halfBet} disabled={isLoading}>
              ½
            </button>
            <input
              type="number"
              className="input"
              value={betAmount}
              min={1}
              max={MAX_BET}
              onChange={(e) =>
                onBetChange(Math.max(1, Math.min(MAX_BET, Number(e.target.value))))
              }
              disabled={isLoading || !canCommit}
              style={{ textAlign: "center", fontWeight: 700 }}
              id="bet-amount-input"
            />
            <button className="btn btn-secondary btn-sm" onClick={doubleBet} disabled={isLoading}>
              2×
            </button>
          </div>

          {/* Quick bet buttons */}
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {QUICK_BETS.map((v) => (
              <button
                key={v}
                className={`btn btn-sm ${betAmount === v ? "btn-primary" : "btn-secondary"}`}
                onClick={() => onBetChange(v)}
                disabled={isLoading || !canCommit}
                id={`quick-bet-${v}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drop Column */}
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <div className="form-group">
          <label className="label" htmlFor="drop-column-range">
            Drop Column:{" "}
            <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>
              {dropColumn}
            </span>
            <span
              style={{
                color: "var(--color-text-dim)",
                fontSize: "0.7rem",
                marginLeft: "8px",
              }}
            >
              (← → keys)
            </span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <button
              className="btn btn-icon btn-sm"
              onClick={() => onDropColumnChange(Math.max(0, dropColumn - 1))}
              disabled={!canDrop}
              aria-label="Move drop column left"
            >
              ◀
            </button>
            <input
              id="drop-column-range"
              type="range"
              min={0}
              max={BINS - 1}
              value={dropColumn}
              onChange={(e) => onDropColumnChange(Number(e.target.value))}
              disabled={!canDrop}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-icon btn-sm"
              onClick={() => onDropColumnChange(Math.min(BINS - 1, dropColumn + 1))}
              disabled={!canDrop}
              aria-label="Move drop column right"
            >
              ▶
            </button>
          </div>

          {/* Column visual indicator */}
          <div
            style={{
              display: "flex",
              gap: "2px",
              justifyContent: "center",
              marginTop: "4px",
            }}
          >
            {Array.from({ length: BINS }, (_, i) => (
              <div
                key={i}
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "2px",
                  background:
                    i === dropColumn
                      ? "var(--color-primary)"
                      : "var(--color-surface-3)",
                  transition: "background 0.15s ease",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Client Seed */}
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <div className="form-group">
          <label className="label" htmlFor="client-seed-input">
            Client Seed
          </label>
          <input
            id="client-seed-input"
            type="text"
            className="input input-mono"
            value={clientSeed}
            onChange={(e) => onClientSeedChange(e.target.value)}
            disabled={isLoading || !canCommit}
            placeholder="Your random seed..."
            spellCheck={false}
          />
          <p
            style={{
              fontSize: "0.72rem",
              color: "var(--color-text-dim)",
              lineHeight: 1.5,
            }}
          >
            Change before committing. This is mixed with the server seed to
            determine the outcome.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {showCommitBtn && (
          <button
            id="commit-btn"
            className="btn btn-primary btn-lg w-full"
            onClick={onCommit}
            disabled={isLoading}
          >
            {phase === "COMMITTING" ? (
              <>
                <span className="spinner" /> Committing…
              </>
            ) : phase === "REVEALED" || phase === "ERROR" ? (
              "🔄 New Round"
            ) : (
              "🔒 Commit Round"
            )}
          </button>
        )}

        {canDrop && (
          <button
            id="drop-btn"
            className="btn btn-success btn-lg w-full animate-pulse-glow"
            onClick={onDrop}
            disabled={betAmount > balance}
            aria-label="Drop ball (Space)"
          >
            🎱 Drop Ball
            <span
              style={{
                fontSize: "0.72rem",
                opacity: 0.7,
                marginLeft: "4px",
              }}
            >
              [Space]
            </span>
          </button>
        )}

        {canReveal && (
          <button
            id="reveal-btn"
            className="btn btn-danger btn-lg w-full"
            onClick={onReveal}
          >
            🔓 Reveal & Settle
          </button>
        )}

        {(phase === "REVEALED" || phase === "ERROR") && (
          <button
            id="reset-btn"
            className="btn btn-secondary w-full"
            onClick={onReset}
          >
            Reset
          </button>
        )}

        {betAmount > balance && canDrop && (
          <p
            style={{
              color: "var(--color-accent)",
              fontSize: "0.8rem",
              textAlign: "center",
            }}
          >
            ⚠ Bet exceeds balance
          </p>
        )}
      </div>

      {/* Keyboard hint */}
      <div
        style={{
          padding: "var(--space-3)",
          background: "var(--color-surface-2)",
          borderRadius: "var(--radius-md)",
          fontSize: "0.72rem",
          color: "var(--color-text-dim)",
          lineHeight: 1.7,
        }}
      >
        <strong style={{ color: "var(--color-text-muted)" }}>Keyboard</strong>
        <br />
        ← → Adjust column &nbsp;|&nbsp; Space Drop ball
      </div>
    </div>
  );
}
