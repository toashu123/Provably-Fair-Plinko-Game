"use client";
import { useEffect, useRef } from "react";

interface ConfettiProps {
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  size: number;
  opacity: number;
  shape: "rect" | "circle";
}

const COLORS = [
  "#6c63ff",
  "#00d4aa",
  "#ffd700",
  "#ff6b6b",
  "#ff8c00",
  "#00b4d8",
  "#ffffff",
];

export default function Confetti({ active }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const activeRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas to fill viewport
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Spawn particles
    const count = 120;
    const cx = canvas.width / 2;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: cx + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 16 - 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.25,
      size: 6 + Math.random() * 8,
      opacity: 1,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    }));

    activeRef.current = true;

    function animate() {
      if (!activeRef.current) return;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      let alive = false;
      particlesRef.current.forEach((p) => {
        if (p.opacity <= 0) return;
        alive = true;

        // Physics
        p.vy += 0.4; // gravity
        p.vx *= 0.99; // drag
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        if (p.y > canvas!.height * 0.7) p.opacity -= 0.025;

        ctx!.save();
        ctx!.globalAlpha = Math.max(0, p.opacity);
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation);
        ctx!.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx!.beginPath();
          ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.restore();
      });

      if (alive) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
        activeRef.current = false;
      }
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      activeRef.current = false;
      cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  );
}
