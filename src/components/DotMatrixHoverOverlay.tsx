import { useEffect, useRef } from 'react';

interface DotMatrixHoverOverlayProps {
  isHovered: boolean;
}

/**
 * Shared dot-matrix visual rule on card hover:
 * divides the image into fixed cells and grows/shrinks crisp squares inside each cell.
 */
export function DotMatrixHoverOverlay({ isHovered }: DotMatrixHoverOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const hoveredRef = useRef(isHovered);
  hoveredRef.current = isHovered;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const target = hoveredRef.current ? 1 : 0;
      const diff = target - progressRef.current;

      if (Math.abs(diff) > 0.002) {
        progressRef.current += diff * Math.min(1, dt * 11);
      } else {
        progressRef.current = target;
      }

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w > 0 && h > 0) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const tw = Math.floor(w * dpr);
        const th = Math.floor(h * dpr);
        if (canvas.width !== tw || canvas.height !== th) {
          canvas.width = tw;
          canvas.height = th;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const p = progressRef.current;
        if (p > 0.004) {
          const cellSize = 22;
          const cols = Math.ceil(w / cellSize);
          const rows = Math.ceil(h / cellSize);

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              // Stagger square growth subtly across diagonal + bottom gradient bias
              const wave = (c / Math.max(cols, 1)) * 0.35 + (1 - r / Math.max(rows, 1)) * 0.25;
              const localGrow = Math.max(0, Math.min(1, (p * 1.45 - wave) * 1.3));
              if (localGrow <= 0.01) continue;

              // Transient square growth pulse that peaks mid-hover and settles into crisp corner accents
              const pulse = Math.sin(localGrow * Math.PI);
              const settleBottom = (r / Math.max(rows, 1)) * 0.38 * p;
              const size = cellSize * Math.min(0.92, pulse * 0.72 + settleBottom);

              if (size <= 0.5) continue;

              const x = c * cellSize + (cellSize - size) * 0.5;
              const y = r * cellSize + (cellSize - size) * 0.5;

              ctx.fillStyle = pulse > 0.45 ? 'rgba(43, 59, 224, 0.28)' : 'rgba(17, 17, 17, 0.32)';
              ctx.fillRect(x, y, size, size);
            }
          }
        }
      }

      if (Math.abs(target - progressRef.current) > 0.002 || hoveredRef.current) {
        rafId = window.requestAnimationFrame(draw);
      } else {
        rafId = 0;
      }
    };

    rafId = window.requestAnimationFrame(draw);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [isHovered]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
