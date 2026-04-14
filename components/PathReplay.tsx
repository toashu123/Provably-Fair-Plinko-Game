"use client";
import { useRef, useEffect, useCallback } from "react";
import type { Move } from "@/hooks/useGameState";
import { PAYOUT_MULTIPLIERS } from "@/lib/engine/payouts";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROWS = 12;
const BINS = 13;
const PEG_RADIUS = 5;
const BALL_RADIUS = 9;
const BIN_HEIGHT = 44;

function binColor(mult: number): string {
  if (mult >= 10) return "#ff4444";
  if (mult >= 4) return "#ff8c00";
  if (mult >= 2) return "#ffd700";
  if (mult >= 1) return "#44dd88";
  return "#6c63ff";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PathReplayProps {
  path: Move[];
  binIndex: number;
  currentStep: number; // 0 = before game, 1..12 = after each row
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function getLayout(width: number) {
  const padX = 24;
  const padTop = 20;
  const boardWidth = width - padX * 2;
  const rowSpacing = 44;
  const colSpacing = boardWidth / (BINS - 1);
  const boardHeight = ROWS * rowSpacing + BIN_HEIGHT + 20;

  const pegPositions: { x: number; y: number }[][] = [];
  for (let row = 0; row < ROWS; row++) {
    const numPegs = row + 2;
    const rowPegs: { x: number; y: number }[] = [];
    for (let col = 0; col < numPegs; col++) {
      const x = padX + (boardWidth / (numPegs - 1)) * col;
      const y = padTop + (row + 1) * rowSpacing;
      rowPegs.push({ x, y });
    }
    pegPositions.push(rowPegs);
  }

  const binPositions = Array.from(
    { length: BINS },
    (_, i) => padX + colSpacing * i
  );

  return { padX, padTop, boardWidth, rowSpacing, boardHeight, pegPositions, binPositions, colSpacing };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PathReplay({ path, binIndex, currentStep }: PathReplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width } = canvas;
    ctx.clearRect(0, 0, width, canvas.height);

    const layout = getLayout(width);
    const { pegPositions, binPositions, padTop, boardHeight } = layout;

    // ── Draw pegs ──────────────────────────────────────────────────────
    // Highlight the visited pegs and dim the future ones
    let pos = 0;
    for (let row = 0; row < ROWS; row++) {
      const numPegs = row + 2;
      for (let col = 0; col < numPegs; col++) {
        const { x, y } = pegPositions[row][col];
        const isOnPath = row < currentStep && col === (
          // The peg hit at this row is at `pos_before_this_row`
          (() => {
            let p = 0;
            for (let r = 0; r < row; r++) {
              if (path[r] === "R") p++;
            }
            return p;
          })()
        );
        const isFuture = row >= currentStep;

        ctx.beginPath();
        ctx.arc(x, y, PEG_RADIUS, 0, Math.PI * 2);
        if (isOnPath) {
          ctx.fillStyle = "#6c63ff";
          ctx.shadowColor = "rgba(108,99,255,0.8)";
          ctx.shadowBlur = 10;
        } else if (isFuture) {
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Advance pos after drawing row
      if (row < currentStep && path[row] === "R") pos++;
    }

    // ── Draw path lines ───────────────────────────────────────────────
    if (currentStep > 0) {
      let trailPos = 0;
      ctx.strokeStyle = "rgba(108,99,255,0.7)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();

      // Start above first peg
      const startX = binPositions[6]; // center column start
      ctx.moveTo(binPositions[Math.max(0, Math.min(BINS - 1, 6))], padTop);

      for (let row = 0; row < Math.min(currentStep, ROWS); row++) {
        const numPegs = row + 2;
        const pegX = pegPositions[row][Math.min(trailPos, numPegs - 1)].x;
        const pegY = pegPositions[row][Math.min(trailPos, numPegs - 1)].y;
        ctx.lineTo(pegX, pegY);
        if (path[row] === "R") trailPos++;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Draw bins ─────────────────────────────────────────────────────
    const binW = binPositions[1] - binPositions[0];
    const binY = padTop + boardHeight - BIN_HEIGHT;
    const isLanded = currentStep >= ROWS;

    for (let i = 0; i < BINS; i++) {
      const x = binPositions[i] - binW / 2;
      const mult = PAYOUT_MULTIPLIERS[i];
      const color = binColor(mult);
      const active = isLanded && i === binIndex;

      ctx.fillStyle = active ? color : `${color}22`;
      ctx.beginPath();
      ctx.roundRect(x + 2, binY + 2, binW - 4, BIN_HEIGHT - 6, 6);
      ctx.fill();
      ctx.strokeStyle = active ? color : `${color}55`;
      ctx.lineWidth = active ? 2 : 1;
      ctx.stroke();

      if (active) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = active ? "#000" : color;
      ctx.font = `bold ${mult >= 4 ? 11 : 10}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${mult}x`, binPositions[i], binY + BIN_HEIGHT / 2 - 2);
    }

    // ── Draw ball ─────────────────────────────────────────────────────
    let ballX: number;
    let ballY: number;

    if (currentStep === 0) {
      ballX = binPositions[6];
      ballY = padTop - 5;
    } else if (currentStep >= ROWS) {
      // Landed in bin
      ballX = binPositions[Math.max(0, Math.min(BINS - 1, binIndex))];
      ballY = binY + BIN_HEIGHT / 2;
    } else {
      // At peg after currentStep rows
      let p = 0;
      for (let r = 0; r < currentStep; r++) {
        if (path[r] === "R") p++;
      }
      const numPegs = currentStep + 1;
      ballX = pegPositions[currentStep - 1][Math.min(p, numPegs - 1)].x;
      ballY = pegPositions[currentStep - 1][Math.min(p, numPegs - 1)].y;
    }

    const highlight = currentStep >= ROWS;
    const grad = ctx.createRadialGradient(
      ballX - 2,
      ballY - 2,
      1,
      ballX,
      ballY,
      BALL_RADIUS
    );
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.4, highlight ? "#ffd700" : "#6c63ff");
    grad.addColorStop(1, highlight ? "#ff8c00" : "#3a2fd0");

    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowColor = highlight ? "#ffd700" : "rgba(108,99,255,0.8)";
    ctx.shadowBlur = highlight ? 25 : 15;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [path, binIndex, currentStep]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver(() => {
      const w = parent.clientWidth || 600;
      const layout = getLayout(w);
      canvas.width = w;
      canvas.height = layout.boardHeight + 40;
      drawFrame();
    });
    ro.observe(parent);

    const w = parent.clientWidth || 600;
    const layout = getLayout(w);
    canvas.width = w;
    canvas.height = layout.boardHeight + 40;

    return () => ro.disconnect();
  }, [drawFrame]);

  // Redraw on step change
  useEffect(() => {
    drawFrame();
  }, [drawFrame, currentStep]);

  return (
    <div
      style={{
        width: "100%",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%" }}
        aria-label="Step-by-step path replay"
        role="img"
      />
    </div>
  );
}
