"use client";
import { useRef, useEffect, useCallback } from "react";
import type { Move } from "@/hooks/useGameState";
import { PAYOUT_MULTIPLIERS } from "@/lib/engine/payouts";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROWS = 12;
const BINS = 13;
const PEG_RADIUS = 5;
const BALL_RADIUS = 10;
const BIN_HEIGHT = 44;

// Multiplier → color mapping
function binColor(mult: number): string {
  if (mult >= 10) return "#ff4444";
  if (mult >= 4) return "#ff8c00";
  if (mult >= 2) return "#ffd700";
  if (mult >= 1) return "#44dd88";
  return "#6c63ff";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlinkoBoardProps {
  path: Move[] | null;
  binIndex: number | null;
  dropColumn: number;
  isAnimating: boolean;
  onAnimationComplete?: () => void;
  onPegTick?: () => void;
  reducedMotion?: boolean;
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────

function drawPegs(
  ctx: CanvasRenderingContext2D,
  pegPositions: { x: number; y: number }[][]
) {
  pegPositions.forEach((row) => {
    row.forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(x, y, PEG_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.shadowColor = "rgba(108,99,255,0.6)";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  });
}

function drawBins(
  ctx: CanvasRenderingContext2D,
  binPositions: number[],
  boardTop: number,
  boardHeight: number,
  landedBin: number | null
) {
  const binW = binPositions[1] - binPositions[0];
  const y = boardTop + boardHeight - BIN_HEIGHT;

  for (let i = 0; i < BINS; i++) {
    const x = binPositions[i] - binW / 2;
    const mult = PAYOUT_MULTIPLIERS[i];
    const color = binColor(mult);
    const isLanded = landedBin === i;

    // Background
    ctx.fillStyle = isLanded
      ? color
      : `${color}22`;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, binW - 4, BIN_HEIGHT - 6, 6);
    ctx.fill();

    // Border
    ctx.strokeStyle = isLanded ? color : `${color}55`;
    ctx.lineWidth = isLanded ? 2 : 1;
    ctx.stroke();

    // Glow on landed
    if (isLanded) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Multiplier label
    ctx.fillStyle = isLanded ? "#000" : color;
    ctx.font = `bold ${mult >= 4 ? 11 : 10}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = mult >= 1 ? `${mult}x` : `${mult}x`;
    ctx.fillText(label, binPositions[i], y + BIN_HEIGHT / 2 - 2);
  }
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  highlight = false
) {
  // Gradient ball
  const grad = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, BALL_RADIUS);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.4, highlight ? "#ffd700" : "#6c63ff");
  grad.addColorStop(1, highlight ? "#ff8c00" : "#3a2fd0");

  ctx.beginPath();
  ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.shadowColor = highlight ? "#ffd700" : "rgba(108,99,255,0.8)";
  ctx.shadowBlur = highlight ? 25 : 15;
  ctx.fill();
  ctx.shadowBlur = 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlinkoBoard({
  path,
  binIndex,
  dropColumn,
  isAnimating,
  onAnimationComplete,
  onPegTick,
  reducedMotion = false,
}: PlinkoBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const animStateRef = useRef<{
    step: number;
    progress: number;
    done: boolean;
    landedBin: number | null;
  }>({ step: 0, progress: 0, done: false, landedBin: null });

  // Layout computation — recomputed every draw
  const getLayout = useCallback((width: number) => {
    const padX = 24;
    const padTop = 20;
    const boardWidth = width - padX * 2;
    const rowSpacing = 44;
    const colSpacing = boardWidth / (BINS - 1);
    const boardHeight = ROWS * rowSpacing + BIN_HEIGHT + 20;

    // Peg positions: triangular grid, centered
    const pegPositions: { x: number; y: number }[][] = [];
    for (let row = 0; row < ROWS; row++) {
      const numPegs = row + 2; // row 0 has 2 pegs, row 11 has 13 pegs
      const rowPegs: { x: number; y: number }[] = [];
      for (let col = 0; col < numPegs; col++) {
        const x =
          padX + (boardWidth / (numPegs - 1)) * col;
        const y = padTop + (row + 1) * rowSpacing;
        rowPegs.push({ x, y });
      }
      pegPositions.push(rowPegs);
    }

    // Bin centers at the bottom — 13 equally spaced
    const binPositions = Array.from({ length: BINS }, (_, i) => padX + colSpacing * i);

    return { padX, padTop, boardWidth, rowSpacing, boardHeight, pegPositions, binPositions, colSpacing };
  }, []);

  // Compute ball position along path at a given step + progress
  const getBallPos = useCallback(
    (
      step: number,
      progress: number,
      pegPositions: { x: number; y: number }[][],
      binPositions: number[],
      padTop: number,
      rowSpacing: number,
      currentPath: Move[]
    ) => {
      if (step === 0) {
        // Starting position above first peg row
        const startX = pegPositions[0][dropColumn <= 6 ? 0 : 1].x +
          (binPositions[dropColumn] - pegPositions[0][0].x) * 0.5;
        const targetX = binPositions[dropColumn];
        return {
          x: targetX,
          y: padTop + rowSpacing * progress,
        };
      }

      if (step > currentPath.length) {
        // Landed in bin
        return {
          x: binPositions[binIndex ?? 6],
          y: pegPositions[ROWS - 1][0].y + rowSpacing,
        };
      }

      // Trace path to get current column (number of R moves so far)
      let pos = 0;
      for (let i = 0; i < step - 1; i++) {
        if (currentPath[i] === "R") pos++;
      }

      const row = step - 1;
      // Current peg: in row `row`, we hit peg at index `pos`
      // Next peg: in row+1 if it exists
      const numPegsInRow = row + 2;
      const pegX = pegPositions[row]
        ? pegPositions[row][Math.min(pos, numPegsInRow - 1)]?.x ?? binPositions[pos]
        : binPositions[pos];

      let nextX = pegX;
      if (row + 1 < ROWS) {
        const nextPos = currentPath[row] === "R" ? pos + 1 : pos;
        const nextNumPegs = row + 3;
        nextX = pegPositions[row + 1]
          ? pegPositions[row + 1][Math.min(nextPos, nextNumPegs - 1)]?.x ?? binPositions[nextPos]
          : binPositions[nextPos];
      } else {
        nextX = binPositions[pos + (currentPath[row] === "R" ? 1 : 0)];
      }

      const fromY = pegPositions[row]?.[Math.min(pos, numPegsInRow - 1)]?.y ?? 0;
      const toY = row + 1 < ROWS
        ? (pegPositions[row + 1]?.[0]?.y ?? fromY + rowSpacing)
        : fromY + rowSpacing;

      // Bounce arc
      const arcY = Math.sin(progress * Math.PI) * -6;

      return {
        x: pegX + (nextX - pegX) * progress,
        y: fromY + (toY - fromY) * progress + arcY,
      };
    },
    [dropColumn, binIndex]
  );

  // Main draw function
  const draw = useCallback(
    (landedBin: number | null, ballX: number, ballY: number, highlight: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const layout = getLayout(width);
      const { pegPositions, binPositions, padTop, rowSpacing, boardHeight } = layout;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "rgba(18,20,26,0)");
      bgGrad.addColorStop(1, "rgba(18,20,26,0.8)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Drop column indicator (vertical line)
      if (!isAnimating && !landedBin !== null) {
        ctx.save();
        ctx.strokeStyle = "rgba(108,99,255,0.25)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(binPositions[dropColumn], padTop);
        ctx.lineTo(binPositions[dropColumn], padTop + boardHeight - BIN_HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Draw pegs
      drawPegs(ctx, pegPositions);

      // Draw bins
      drawBins(ctx, binPositions, padTop, boardHeight, landedBin);

      // Draw ball
      drawBall(ctx, ballX, ballY, highlight);
    },
    [getLayout, dropColumn, isAnimating]
  );

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const layout = getLayout(canvas.width);
    const { pegPositions, binPositions, padTop, rowSpacing } = layout;

    if (!isAnimating || !path) {
      // Static draw: show ball at drop position
      animStateRef.current = { step: 0, progress: 0, done: false, landedBin: null };
      const ballX = binPositions[dropColumn];
      const ballY = padTop - 5;
      draw(binIndex, ballX, ballY, !!binIndex);
      return;
    }

    // Reduced motion: instant result
    if (reducedMotion) {
      draw(binIndex, binPositions[binIndex ?? 6], pegPositions[ROWS - 1][0].y + rowSpacing, true);
      onAnimationComplete?.();
      return;
    }

    // Animate
    animStateRef.current = { step: 1, progress: 0, done: false, landedBin: null };
    let lastTime: number | null = null;
    const stepDuration = 120; // ms per row

    function animate(time: number) {
      if (!lastTime) lastTime = time;
      const dt = time - lastTime;
      lastTime = time;

      const state = animStateRef.current;
      if (state.done) return;

      state.progress += dt / stepDuration;

      if (state.progress >= 1) {
        // Emit tick sound on peg hit
        onPegTick?.();
        state.progress = 0;
        state.step++;

        if (state.step > path!.length) {
          // Landed
          state.done = true;
          state.landedBin = binIndex;
          const ballX = binPositions[binIndex ?? 6];
          const ballY = pegPositions[ROWS - 1][0].y + rowSpacing;
          draw(state.landedBin, ballX, ballY, true);
          onAnimationComplete?.();
          return;
        }
      }

      const pos = getBallPos(
        state.step,
        state.progress,
        pegPositions,
        binPositions,
        padTop,
        rowSpacing,
        path!
      );
      draw(null, pos.x, pos.y, false);
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAnimating, path, binIndex, dropColumn, draw, getBallPos, getLayout, onAnimationComplete, onPegTick, reducedMotion]);

  // Resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver(() => {
      const w = parent.clientWidth;
      const layout = getLayout(w);
      canvas.width = w;
      canvas.height = layout.boardHeight + 40;
      // Redraw after resize
      const { pegPositions, binPositions, padTop, rowSpacing } = layout;
      const ballX = binPositions[dropColumn];
      const ballY = padTop - 5;
      draw(null, ballX, ballY, false);
    });
    ro.observe(parent);

    // Initial size
    const w = parent.clientWidth || 600;
    const layout = getLayout(w);
    canvas.width = w;
    canvas.height = layout.boardHeight + 40;

    return () => ro.disconnect();
  }, [getLayout, dropColumn, draw]);

  return (
    <div
      style={{
        width: "100%",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%" }}
        aria-label="Plinko game board"
        role="img"
      />
    </div>
  );
}
