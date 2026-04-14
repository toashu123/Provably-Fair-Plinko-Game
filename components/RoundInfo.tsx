"use client";
import type { RoundData } from "@/hooks/useGameState";

interface RoundInfoProps {
  round: RoundData | null;
  phase: string;
}

export default function RoundInfo({ round, phase }: RoundInfoProps) {
  if (!round) {
    return (
      <div
        className="card animate-fade-in"
        style={{ textAlign: "center", padding: "var(--space-8)" }}
      >
        <div
          style={{
            fontSize: "2.5rem",
            marginBottom: "var(--space-4)",
            animation: "float 3s ease-in-out infinite",
          }}
        >
          🎰
        </div>
        <h3 style={{ color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
          Ready to Play
        </h3>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>
          Click <strong>Commit Round</strong> to begin. The server will lock in
          a secret seed — you can verify the outcome was fair after revealing.
        </p>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in" style={{ padding: "var(--space-5)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-4)",
        }}
      >
        <h3 style={{ fontSize: "0.95rem" }}>Round Info</h3>
        <span
          className={`badge ${
            phase === "COMMITTED"
              ? "badge-primary"
              : phase === "DROPPING"
              ? "badge-warning"
              : phase === "REVEALED"
              ? "badge-success"
              : "badge-neutral"
          }`}
        >
          {phase}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <Field label="Round ID" value={round.roundId} mono copyable />
        <Field label="Nonce" value={round.nonce} mono />
        <Field label="Commit Hash (SHA-256)" value={round.commitHex} mono copyable truncate />
      </div>

      <div
        style={{
          marginTop: "var(--space-4)",
          padding: "var(--space-3)",
          background: "rgba(108,99,255,0.06)",
          borderRadius: "var(--radius-md)",
          border: "1px solid rgba(108,99,255,0.15)",
          fontSize: "0.72rem",
          color: "var(--color-text-muted)",
          lineHeight: 1.6,
        }}
      >
        🔒 The commit hash is SHA-256(serverSeed:nonce). The server seed is
        hidden until you reveal — proving the outcome wasn&apos;t tampered with.
      </div>
    </div>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label,
  value,
  mono = false,
  copyable = false,
  truncate = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  truncate?: boolean;
}) {
  const copy = () => navigator.clipboard.writeText(value);
  const display = truncate
    ? `${value.slice(0, 16)}…${value.slice(-8)}`
    : value;

  return (
    <div>
      <div className="label">{label}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <div
          className="code-block"
          style={{
            flex: 1,
            fontSize: mono ? "0.72rem" : "0.85rem",
            padding: "6px 10px",
            cursor: truncate ? "help" : "default",
          }}
          title={value}
        >
          {display}
        </div>
        {copyable && (
          <button
            className="btn btn-icon"
            onClick={copy}
            title="Copy to clipboard"
            style={{ flexShrink: 0 }}
          >
            📋
          </button>
        )}
      </div>
    </div>
  );
}
