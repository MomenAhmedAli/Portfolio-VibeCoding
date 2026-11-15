import { useEffect, useRef } from 'react';
import { setScrambleTransitionOpen } from './ScrambleLines';

interface DotMatrixTransitionProps {
  theme: 'light' | 'dark';
  transitionId: number;
}

/**
 * Full-screen radial dot-matrix cell transition.
 * Each cell's circle radius shrinks/grows from a radial wave matching the active color theme.
 */
export function DotMatrixTransition({ theme, transitionId }: DotMatrixTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setScrambleTransitionOpen(true);
      canvas.style.display = 'none';
      return;
    }

    canvas.style.display = 'block';
    setScrambleTransitionOpen(false);

    const cellSize = 26;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = Math.ceil(vw / cellSize) + 1;
    const rows = Math.ceil(vh / cellSize) + 1;
    const isInitialLoad = transitionId === 0;
    const duration = isInitialLoad ? 720 : 520;
    const startTime = performance.now();
    let rafId = 0;
    let openedNotified = false;

    const fillColor = theme === 'dark' ? '#060D3D' : '#C8E3FA';
    const accentColor = '#2B3BE0';

    const draw = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      if (!openedNotified && t >= 0.25) {
        openedNotified = true;
        setScrambleTransitionOpen(true);
      }

      ctx.clearRect(0, 0, vw, vh);

      // Ease-out radial opening wave from center outward
      const eased = 1 - Math.pow(1 - t, 3);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = (c + 0.5) * cellSize;
          const cy = (r + 0.5) * cellSize;

          const nx = (cx / vw - 0.5) * (vw / Math.max(vh, 1));
          const ny = cy / vh - 0.5;
          const dist = Math.hypot(nx, ny) / 0.85;

          // Radial mask alpha drives circle radius inside each grid cell
          const cellAlpha = Math.max(0, Math.min(1, 1 - (eased * 1.45 - dist * 0.45)));
          const radius = cellSize * 0.78 * cellAlpha;

          if (radius <= 0.4) continue;

          ctx.fillStyle = cellAlpha < 0.28 ? accentColor : fillColor;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (t < 1) {
        rafId = window.requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, vw, vh);
        canvas.style.display = 'none';
      }
    };

    rafId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(rafId);
      setScrambleTransitionOpen(true);
    };
  }, [theme, transitionId]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-50 pointer-events-none"
    />
  );
}
