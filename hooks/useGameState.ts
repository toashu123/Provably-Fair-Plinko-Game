"use client";
import { useState, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GamePhase =
  | "IDLE"
  | "COMMITTING"
  | "COMMITTED"
  | "DROPPING"
  | "REVEALED"
  | "ERROR";

export type Move = "L" | "R";

export interface RoundData {
  roundId: string;
  commitHex: string;
  nonce: string;
}

export interface StartResult {
  pegMapHash: string;
  rows: number;
  path: Move[];
  binIndex: number;
  payoutMultiplier: number;
  combinedSeed: string;
}

export interface RevealResult {
  serverSeed: string;
  combinedSeed: string;
  commitHex: string;
  nonce: string;
  clientSeed: string;
  pegMapHash: string;
  binIndex: number;
  payoutMultiplier: number;
  dropColumn: number;
}

export interface GameState {
  phase: GamePhase;
  balance: number;
  round: RoundData | null;
  startResult: StartResult | null;
  revealResult: RevealResult | null;
  error: string | null;
  // user inputs
  clientSeed: string;
  betAmount: number; // in whole units (1 unit = 1 cent for DB storage)
  dropColumn: number;
  // mute
  muted: boolean;
}

// ─── Initial state ─────────────────────────────────────────────────────────────

const INITIAL_BALANCE = 1000;

function randomClientSeed(): string {
  return `cs-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGameState() {
  const [phase, setPhase] = useState<GamePhase>("IDLE");
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [round, setRound] = useState<RoundData | null>(null);
  const [startResult, setStartResult] = useState<StartResult | null>(null);
  const [revealResult, setRevealResult] = useState<RevealResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState(randomClientSeed);
  const [betAmount, setBetAmount] = useState(10);
  const [dropColumn, setDropColumn] = useState(6);
  const [muted, setMuted] = useState(false);

  // Prevent double-submits
  const inFlightRef = useRef(false);

  // ── Commit ────────────────────────────────────────────────────────────────
  const commitRound = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setPhase("COMMITTING");
    setError(null);
    setStartResult(null);
    setRevealResult(null);

    try {
      const res = await fetch("/api/rounds/commit", { method: "POST" });
      if (!res.ok) throw new Error(`Commit failed: ${res.status}`);
      const data: RoundData = await res.json();
      setRound(data);
      setPhase("COMMITTED");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setPhase("ERROR");
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  // ── Drop (start) ──────────────────────────────────────────────────────────
  const dropBall = useCallback(async () => {
    if (!round || inFlightRef.current) return;
    if (betAmount > balance) {
      setError("Insufficient balance");
      return;
    }
    inFlightRef.current = true;
    setPhase("DROPPING");
    setError(null);

    try {
      const res = await fetch(`/api/rounds/${round.roundId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSeed,
          betCents: betAmount,
          dropColumn,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `Start failed: ${res.status}`);
      }
      const data: StartResult = await res.json();
      setStartResult(data);
      // Deduct bet immediately (will be reconciled on reveal)
      setBalance((b) => b - betAmount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setPhase("ERROR");
    } finally {
      inFlightRef.current = false;
    }
  }, [round, betAmount, balance, clientSeed, dropColumn]);

  // ── Reveal ────────────────────────────────────────────────────────────────
  const revealRound = useCallback(async () => {
    if (!round || !startResult || inFlightRef.current) return;
    inFlightRef.current = true;
    setError(null);

    try {
      const res = await fetch(`/api/rounds/${round.roundId}/reveal`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Reveal failed: ${res.status}`);
      const data: RevealResult = await res.json();
      setRevealResult(data);

      // Credit winnings
      const winnings = Math.floor(betAmount * data.payoutMultiplier);
      setBalance((b) => b + winnings);
      setPhase("REVEALED");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setPhase("ERROR");
    } finally {
      inFlightRef.current = false;
    }
  }, [round, startResult, betAmount]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setPhase("IDLE");
    setRound(null);
    setStartResult(null);
    setRevealResult(null);
    setError(null);
    setClientSeed(randomClientSeed());
  }, []);

  // ── Column controls ───────────────────────────────────────────────────────
  const moveLeft = useCallback(() => {
    if (phase !== "COMMITTED") return;
    setDropColumn((c) => Math.max(0, c - 1));
  }, [phase]);

  const moveRight = useCallback(() => {
    if (phase !== "COMMITTED") return;
    setDropColumn((c) => Math.min(12, c + 1));
  }, [phase]);

  return {
    // State
    phase,
    balance,
    round,
    startResult,
    revealResult,
    error,
    clientSeed,
    betAmount,
    dropColumn,
    muted,
    // Actions
    commitRound,
    dropBall,
    revealRound,
    reset,
    moveLeft,
    moveRight,
    setClientSeed,
    setBetAmount,
    setDropColumn,
    setMuted,
  };
}
