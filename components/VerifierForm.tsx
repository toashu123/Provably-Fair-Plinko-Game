"use client";
import { useState, useCallback } from "react";
import PathReplay from "@/components/PathReplay";
import type { Move } from "@/hooks/useGameState";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VerifyResponse {
  commitHex: string;
  combinedSeed: string;
  pegMapHash: string;
  binIndex: number;
  payoutMultiplier: number;
  path: Move[];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface VerifierFormProps {
  initialServerSeed?: string;
  initialClientSeed?: string;
  initialNonce?: string;
  initialDropColumn?: string;
}

export default function VerifierForm({
  initialServerSeed = "",
  initialClientSeed = "",
  initialNonce = "",
  initialDropColumn = "6",
}: VerifierFormProps) {
  const [serverSeed, setServerSeed] = useState(initialServerSeed);
  const [clientSeed, setClientSeed] = useState(initialClientSeed);
  const [nonce, setNonce] = useState(initialNonce);
  const [dropColumn, setDropColumn] = useState(initialDropColumn);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const totalSteps = 12; // ROWS + 1 for landed state actually 0..12 -> 13 states

  const verify = useCallback(async () => {
    if (!serverSeed || !clientSeed || !nonce) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setStep(0);

    try {
      const params = new URLSearchParams({
        serverSeed,
        clientSeed,
        nonce,
        dropColumn,
      });
      const res = await fetch(`/api/verify?${params}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data: VerifyResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }, [serverSeed, clientSeed, nonce, dropColumn]);

  // Fill test vector
  const fillTestVector = useCallback(() => {
    setServerSeed(
      "b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc"
    );
    setClientSeed("candidate-hello");
    setNonce("42");
    setDropColumn("6");
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Input form */}
      <div className="card animate-fade-in">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-5)",
          }}
        >
          <h2 style={{ fontSize: "1.1rem" }}>Enter Seeds</h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fillTestVector}
            id="fill-test-vector-btn"
          >
            Fill Test Vector
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="form-group">
            <label className="label" htmlFor="verify-server-seed">
              Server Seed
            </label>
            <input
              id="verify-server-seed"
              type="text"
              className="input input-mono"
              value={serverSeed}
              onChange={(e) => setServerSeed(e.target.value)}
              placeholder="64-char hex string revealed after the round…"
              spellCheck={false}
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="verify-client-seed">
              Client Seed
            </label>
            <input
              id="verify-client-seed"
              type="text"
              className="input input-mono"
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              placeholder="Your seed used during the round…"
              spellCheck={false}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--space-4)",
            }}
          >
            <div className="form-group">
              <label className="label" htmlFor="verify-nonce">
                Nonce
              </label>
              <input
                id="verify-nonce"
                type="text"
                className="input input-mono"
                value={nonce}
                onChange={(e) => setNonce(e.target.value)}
                placeholder="Nonce from round…"
                spellCheck={false}
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="verify-drop-column">
                Drop Column (0–12)
              </label>
              <input
                id="verify-drop-column"
                type="number"
                className="input"
                value={dropColumn}
                min={0}
                max={12}
                onChange={(e) => setDropColumn(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "rgba(255,107,107,0.1)",
                border: "1px solid rgba(255,107,107,0.3)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3) var(--space-4)",
                color: "var(--color-accent)",
                fontSize: "0.85rem",
              }}
            >
              ⚠ {error}
            </div>
          )}

          <button
            id="verify-btn"
            className="btn btn-primary w-full"
            onClick={verify}
            disabled={loading}
            style={{ marginTop: "var(--space-2)" }}
          >
            {loading ? (
              <>
                <span className="spinner" /> Verifying…
              </>
            ) : (
              "🔍 Verify Round"
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div
          className={`card animate-fade-in`}
          style={{
            borderColor: "rgba(0,212,170,0.35)",
            boxShadow: "0 0 30px rgba(0,212,170,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              marginBottom: "var(--space-5)",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>✅</span>
            <h2 style={{ fontSize: "1.1rem" }}>Verification Result</h2>
            <span className="badge badge-success" style={{ marginLeft: "auto" }}>
              VERIFIED
            </span>
          </div>

          {/* Computed fields */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
              marginBottom: "var(--space-6)",
            }}
          >
            <ResultField label="Commit Hash = SHA-256(serverSeed:nonce)" value={result.commitHex} />
            <ResultField label="Combined Seed = SHA-256(serverSeed:clientSeed:nonce)" value={result.combinedSeed} />
            <ResultField label="Peg Map Hash = SHA-256(JSON.stringify(pegMap))" value={result.pegMapHash} />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--space-3)",
              }}
            >
              <div>
                <div className="label">Final Bin Index</div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: "var(--color-primary)",
                    padding: "var(--space-3)",
                    background: "var(--color-surface-2)",
                    borderRadius: "var(--radius-md)",
                    textAlign: "center",
                  }}
                >
                  #{result.binIndex}
                </div>
              </div>
              <div>
                <div className="label">Payout Multiplier</div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: "var(--color-gold)",
                    padding: "var(--space-3)",
                    background: "var(--color-surface-2)",
                    borderRadius: "var(--radius-md)",
                    textAlign: "center",
                  }}
                >
                  {result.payoutMultiplier}×
                </div>
              </div>
            </div>

            {/* Path display */}
            <div>
              <div className="label">Path ({result.path.length} moves)</div>
              <div
                style={{
                  display: "flex",
                  gap: "3px",
                  flexWrap: "wrap",
                  marginTop: "4px",
                }}
              >
                {result.path.map((move, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "24px",
                      height: "24px",
                      borderRadius: "4px",
                      fontSize: "0.73rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      background:
                        i < step - 1
                          ? move === "R"
                            ? "rgba(108,99,255,0.5)"
                            : "rgba(0,212,170,0.4)"
                          : move === "R"
                          ? "rgba(108,99,255,0.15)"
                          : "rgba(0,212,170,0.1)",
                      color:
                        move === "R"
                          ? "var(--color-primary)"
                          : "var(--color-secondary)",
                      border: `1px solid ${
                        move === "R"
                          ? "rgba(108,99,255,0.3)"
                          : "rgba(0,212,170,0.25)"
                      }`,
                      outline:
                        i === step - 1
                          ? "2px solid var(--color-primary)"
                          : "none",
                    }}
                  >
                    {move}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Step controls */}
          <div style={{ marginBottom: "var(--space-4)" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--space-3)",
              }}
            >
              <div className="label" style={{ margin: 0 }}>
                Step-by-Step Replay
              </div>
              <span className="step-indicator">
                {step === 0 ? "Start" : step <= 12 ? `Row ${step}` : "Landed"}
              </span>
            </div>

            <div className="step-controls">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setStep(0)}
                disabled={step === 0}
                id="replay-start-btn"
              >
                ⏮ Start
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                id="replay-prev-btn"
                aria-label="Previous step"
              >
                ◀ Prev
              </button>
              <div
                style={{
                  flex: 1,
                  height: "4px",
                  background: "var(--color-surface-3)",
                  borderRadius: "var(--radius-full)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(step / (totalSteps + 1)) * 100}%`,
                    background:
                      "linear-gradient(90deg, var(--color-primary), var(--color-secondary))",
                    borderRadius: "var(--radius-full)",
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setStep((s) => Math.min(totalSteps + 1, s + 1))}
                disabled={step >= totalSteps + 1}
                id="replay-next-btn"
                aria-label="Next step"
              >
                Next ▶
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setStep(totalSteps + 1)}
                disabled={step >= totalSteps + 1}
                id="replay-end-btn"
              >
                End ⏭
              </button>
            </div>
          </div>

          {/* Canvas replay */}
          <PathReplay
            path={result.path}
            binIndex={result.binIndex}
            currentStep={step}
          />

          <p
            style={{
              marginTop: "var(--space-3)",
              fontSize: "0.72rem",
              color: "var(--color-text-dim)",
              textAlign: "center",
            }}
          >
            Use the controls above to walk through each peg decision.
            Purple = RIGHT move, Teal = LEFT move.
          </p>
        </div>
      )}
    </div>
  );
}

function ResultField({ label, value }: { label: string; value: string }) {
  const copy = () => navigator.clipboard.writeText(value);
  return (
    <div>
      <div className="label">{label}</div>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <div
          className="code-block"
          style={{ flex: 1, fontSize: "0.68rem", wordBreak: "break-all" }}
        >
          {value}
        </div>
        <button className="btn btn-icon" onClick={copy} title="Copy">
          📋
        </button>
      </div>
    </div>
  );
}
