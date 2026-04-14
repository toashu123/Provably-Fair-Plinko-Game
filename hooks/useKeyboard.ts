"use client";
import { useEffect } from "react";

interface KeyboardOptions {
  onLeft: () => void;
  onRight: () => void;
  onDrop: () => void;
  onTilt?: () => void;
  onThemeToggle?: () => void;
  enabled?: boolean;
}

/**
 * Keyboard controls for Plinko:
 * - ArrowLeft / ArrowRight → adjust dropColumn
 * - Space / Enter → drop ball
 * - 't' → toggle TILT mode (Easter egg)
 * - typing 'opensesame' → toggle Dungeon Theme (Easter egg)
 */
export function useKeyboard({ onLeft, onRight, onDrop, onTilt, onThemeToggle, enabled = true }: KeyboardOptions) {
  useEffect(() => {
    if (!enabled) return;

    let keyBuffer = "";

    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      // Track buffer for 'opensesame' secret theme
      if (e.key.length === 1) {
        keyBuffer = (keyBuffer + e.key.toLowerCase()).slice(-10);
        if (keyBuffer === "opensesame" && onThemeToggle) {
          onThemeToggle();
        }
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          onLeft();
          break;
        case "ArrowRight":
          e.preventDefault();
          onRight();
          break;
        case " ":
        case "Enter":
          e.preventDefault();
          onDrop();
          break;
        case "t":
        case "T":
          if (onTilt) {
             e.preventDefault();
             onTilt();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onLeft, onRight, onDrop, onTilt, onThemeToggle, enabled]);
}
