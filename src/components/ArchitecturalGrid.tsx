import { useEffect, useRef, useState } from 'react';
import { addFrameEffect, getLenisScrollSnapshot } from '../lib/lenisScrollBus';

interface ArchitecturalGridProps {
  rowHeight?: number;
  theme?: 'light' | 'dark';
}

interface VideoFallingStar {
  x: number; // normalized 0..1
  y: number; // normalized 0..1 within top-of-page sky band
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  depth: number;
  fallSpeed: number;
  driftX: number;
  trailLen: number;
  isShooting: boolean;
}

interface MouseWavePulse {
  x: number;
  y: number;
  bornAt: number;
  duration: number;
  maxRadius: number;
  strength: number;
  phaseOffset: number;
  active: boolean;
}

function createVideoStars(count: number): VideoFallingStar[] {
  const stars: VideoFallingStar[] = [];
  for (let i = 0; i < count; i++) {
    const depth = 0.28 + Math.random() * 0.92;
    const isShooting = Math.random() > 0.72;
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: isShooting ? 1.3 + Math.random() * 1.1 : 0.8 + Math.random() * 1.2,
      baseAlpha: isShooting ? 0.45 + Math.random() * 0.4 : 0.22 + Math.random() * 0.48,
      twinkleSpeed: 0.9 + Math.random() * 1.6,
      twinkleOffset: Math.random() * Math.PI * 2,
      depth,
      fallSpeed: isShooting
        ? (0.048 + Math.random() * 0.055) * (0.7 + depth * 0.5)
        : (0.016 + Math.random() * 0.024) * (0.65 + depth * 0.5),
      driftX: (Math.random() - 0.35) * (isShooting ? 0.014 : 0.004),
      trailLen: isShooting ? 22 + depth * 28 : 6 + depth * 8,
      isShooting,
    });
  }
  return stars;
}

function createWavePool(size: number): MouseWavePulse[] {
  return Array.from({ length: size }, () => ({
    x: 0,
    y: 0,
    bornAt: 0,
    duration: 1100,
    maxRadius: 150,
    strength: 0,
    phaseOffset: 0,
    active: false,
  }));
}

export function ArchitecturalGrid({ rowHeight = 320, theme = 'light' }: ArchitecturalGridProps) {
  const [gridPoints, setGridPoints] = useState<{ x: number; y: number }[]>([]);
  const [docHeight, setDocHeight] = useState(4500);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  // Align top star intersections snugly right below the nav baseline
  const topOffset = 46;
  // Align vertical columns to match top & bottom 3-column nav layout
  const colPcts = [2.5, 34.5, 66.5, 97.5];

  useEffect(() => {
    const updateGrid = () => {
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        4500
      );
      setDocHeight(height);

      const rowsCount = Math.ceil(height / rowHeight);
      const points: { x: number; y: number }[] = [];

      for (let r = 0; r <= rowsCount; r++) {
        const y = r * rowHeight + topOffset;
        colPcts.forEach((pct) => {
          points.push({ x: pct, y });
        });
      }
      setGridPoints(points);
    };

    updateGrid();
    window.addEventListener('resize', updateGrid);
    const observer = new ResizeObserver(updateGrid);
    observer.observe(document.body);

    return () => {
      window.removeEventListener('resize', updateGrid);
      observer.disconnect();
    };
  }, [rowHeight]);

  // Unified background render:
  // 1. Soft radial light circles (caustic ambient pools)
  // 2. Video-like smooth falling stars at the top/beginning of the page
  // 3. Fluid wave crests & organic undulating wave ripples following the mouse cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stars = createVideoStars(96);
    const wavePool = createWavePool(14);
    let waveCursor = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let targetX = vw * 0.42;
    let targetY = vh * 0.34;
    let smoothX = targetX;
    let smoothY = targetY;
    let prevPointerX = targetX;
    let prevPointerY = targetY;
    let hasPointerMoved = false;
    let pointerActiveAlpha = 0;
    let pointerEnergy = 0;
    let lastPointerMoveAt = 0;
    let lastWaveSpawnAt = 0;

    const resizeCanvas = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!hasPointerMoved) {
        targetX = vw * 0.42;
        targetY = vh * 0.34;
      }
    };

    const spawnWave = (x: number, y: number, speedNorm: number, now: number) => {
      const slot = wavePool[waveCursor];
      waveCursor = (waveCursor + 1) % wavePool.length;
      slot.x = x;
      slot.y = y;
      slot.bornAt = now;
      slot.duration = 950 + speedNorm * 420;
      slot.maxRadius = 115 + speedNorm * 95;
      slot.strength = 0.55 + speedNorm * 0.45;
      slot.phaseOffset = Math.random() * Math.PI * 2;
      slot.active = true;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      const distMoved = Math.hypot(e.clientX - prevPointerX, e.clientY - prevPointerY);
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;

      hasPointerMoved = true;
      targetX = e.clientX;
      targetY = e.clientY;
      lastPointerMoveAt = now;

      const speedNorm = Math.min(1, distMoved / 38);
      pointerEnergy = Math.min(1, pointerEnergy + 0.16 + speedNorm * 0.38);

      if (!reducedMotion && distMoved > 5 && now - lastWaveSpawnAt > 70) {
        lastWaveSpawnAt = now;
        spawnWave(e.clientX, e.clientY, speedNorm, now);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const render = (now: number, delta: number) => {
      const dt = Math.min(Math.max(delta, 1 / 240), 0.1);
      const t = now * 0.001;
      const isDark = themeRef.current === 'dark';

      // Smoothly ease cursor position and wave energy
      smoothX += (targetX - smoothX) * Math.min(1, dt * 8.5);
      smoothY += (targetY - smoothY) * Math.min(1, dt * 8.5);
      pointerEnergy = Math.max(0, pointerEnergy - dt * 1.15);

      const isPointerRecent = hasPointerMoved && now - lastPointerMoveAt < 2200;
      const targetPointerAlpha = isPointerRecent ? 1 : hasPointerMoved ? 0.3 : 0;
      pointerActiveAlpha += (targetPointerAlpha - pointerActiveAlpha) * Math.min(1, dt * 5);

      // Soft cursor-following radial illumination
      if (glowRef.current) {
        glowRef.current.style.background = isDark
          ? `radial-gradient(620px circle at ${smoothX.toFixed(1)}px ${smoothY.toFixed(1)}px, rgba(56, 189, 248, 0.16) 0%, rgba(37, 99, 235, 0.12) 40%, rgba(6, 13, 61, 0) 76%)`
          : `radial-gradient(620px circle at ${smoothX.toFixed(1)}px ${smoothY.toFixed(1)}px, rgba(255, 252, 238, 0.72) 0%, rgba(255, 248, 225, 0.28) 38%, rgba(200, 227, 250, 0) 76%)`;
      }

      ctx.clearRect(0, 0, vw, vh);
      const scrollY = getLenisScrollSnapshot().scrollTop;
      const scrollParallax = scrollY * 0.08;

      // =========================================================================
      // 1. SOFT GLOWING LIGHT CIRCLES (Preserved diffused ambient water pools)
      // =========================================================================
      ctx.save();
      const causticCount = 9;
      for (let i = 0; i < causticCount; i++) {
        const phase = t * (0.42 + (i % 3) * 0.14) + i * 1.37;
        const cx =
          vw * (0.14 + ((i * 0.11) % 0.76)) +
          Math.sin(phase) * (vw * 0.05) +
          ((smoothX / Math.max(vw, 1)) - 0.5) * 28;
        const cy =
          vh * (0.12 + ((i * 0.13) % 0.62)) +
          Math.cos(phase * 0.85) * (vh * 0.04) -
          (scrollParallax * 0.25) % (vh * 0.4);
        const rx = 140 + (i % 4) * 55 + Math.sin(phase * 1.3) * 28;
        const ry = 46 + (i % 3) * 22 + Math.cos(phase * 1.1) * 14;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.28 + Math.sin(phase * 0.5) * 0.12);
        ctx.scale(1, ry / rx);

        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        if (isDark) {
          g.addColorStop(0, `rgba(125, 211, 252, ${(0.085 + Math.sin(phase) * 0.025).toFixed(3)})`);
          g.addColorStop(0.45, 'rgba(59, 130, 246, 0.045)');
          g.addColorStop(1, 'rgba(6, 13, 61, 0)');
        } else {
          g.addColorStop(0, `rgba(255, 253, 240, ${(0.34 + Math.sin(phase) * 0.08).toFixed(3)})`);
          g.addColorStop(0.5, 'rgba(255, 250, 220, 0.12)');
          g.addColorStop(1, 'rgba(200, 227, 250, 0)');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // =========================================================================
      // 2. VIDEO-LIKE FALLING STARS AT THE START / TOP OF THE PAGE ONLY
      // Smooth falling pinpoint starlight & tapered shooting streaks over Hero
      // =========================================================================
      const skyHeight = Math.max(vh * 1.08, 760);
      if (scrollY < skyHeight + 60) {
        const scrollVisibility = Math.max(0, Math.min(1, 1 - scrollY / (skyHeight * 0.92)));
        ctx.save();
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          if (!reducedMotion) {
            s.y = (s.y + s.fallSpeed * dt) % 1;
            s.x = (s.x + s.driftX * dt + 1) % 1;
          }

          const syDoc = s.y * skyHeight;
          const sy = syDoc - scrollY * (0.65 + s.depth * 0.25);
          if (sy < -40 || sy > vh + 20) continue;

          const sx = s.x * vw;
          // Smooth top & bottom envelope so the loop feels like a seamless video
          const topFade = Math.min(1, s.y / 0.1);
          const bottomFade = Math.min(1, (1 - s.y) / 0.24);
          const envelope = topFade * bottomFade * scrollVisibility;
          if (envelope <= 0.01) continue;

          const twinkle = reducedMotion
            ? 0.8
            : 0.62 + 0.38 * Math.sin(t * s.twinkleSpeed + s.twinkleOffset);
          const alpha = Math.min(0.95, s.baseAlpha * twinkle * envelope);

          const trailDx = (s.driftX / Math.max(s.fallSpeed, 0.001)) * s.trailLen;
          const tailX = sx - trailDx;
          const tailY = sy - s.trailLen;

          const trailGrad = ctx.createLinearGradient(tailX, tailY, sx, sy);
          if (isDark) {
            trailGrad.addColorStop(0, 'rgba(186, 230, 253, 0)');
            trailGrad.addColorStop(1, `rgba(224, 242, 254, ${alpha.toFixed(3)})`);
          } else {
            trailGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            trailGrad.addColorStop(1, `rgba(255, 255, 255, ${(alpha * 0.92).toFixed(3)})`);
          }

          ctx.strokeStyle = trailGrad;
          ctx.lineWidth = s.isShooting ? s.size * 0.95 : s.size * 0.7;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(sx, sy);
          ctx.stroke();

          // Soft circular pinpoint starlight head (no hard polygon star shapes)
          ctx.fillStyle = isDark
            ? `rgba(240, 249, 255, ${alpha.toFixed(3)})`
            : `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, s.size * 0.72, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // =========================================================================
      // 3. FLUID MOUSE WAVE EFFECT (Replaces cursor micro-squares, zero closed circles)
      // Flowing layered water-wave crests + traveling wave wakes spawned on cursor movement
      // =========================================================================
      if (pointerActiveAlpha > 0.02) {
        ctx.save();
        const waveWidth = 260 + pointerEnergy * 110;
        const lineCount = 6;
        const strokeRgb = isDark ? '125, 211, 252' : '29, 78, 216';

        // A) Flowing layered water-wave crests centered on cursor
        for (let l = 0; l < lineCount; l++) {
          const bandOffset = (l - (lineCount - 1) * 0.5) * 13;
          const baseWaveY = smoothY + bandOffset;
          const distRatio = Math.abs(l - (lineCount - 1) * 0.5) / 3;
          const bandAlpha =
            pointerActiveAlpha *
            (0.22 + pointerEnergy * 0.34) *
            (1 - distRatio * 0.55);

          const xStart = smoothX - waveWidth * 0.5;
          const xEnd = smoothX + waveWidth * 0.5;

          const strokeGrad = ctx.createLinearGradient(xStart, baseWaveY, xEnd, baseWaveY);
          strokeGrad.addColorStop(0, `rgba(${strokeRgb}, 0)`);
          strokeGrad.addColorStop(0.22, `rgba(${strokeRgb}, ${(bandAlpha * 0.55).toFixed(3)})`);
          strokeGrad.addColorStop(0.5, `rgba(${strokeRgb}, ${bandAlpha.toFixed(3)})`);
          strokeGrad.addColorStop(0.78, `rgba(${strokeRgb}, ${(bandAlpha * 0.55).toFixed(3)})`);
          strokeGrad.addColorStop(1, `rgba(${strokeRgb}, 0)`);

          ctx.strokeStyle = strokeGrad;
          ctx.lineWidth = l === 2 || l === 3 ? 1.55 : 1.0;
          ctx.beginPath();

          const step = 5;
          for (let x = xStart; x <= xEnd; x += step) {
            const norm = (x - smoothX) / (waveWidth * 0.5);
            const bell = Math.exp(-norm * norm * 2.4);
            const amp = (7 + pointerEnergy * 13) * bell;
            const py =
              baseWaveY +
              Math.sin(x * 0.052 - t * 4.6 + l * 0.78) * amp +
              Math.cos(x * 0.025 + t * 3.0 - l * 0.55) * (amp * 0.45);
            if (x === xStart) ctx.moveTo(x, py);
            else ctx.lineTo(x, py);
          }
          ctx.stroke();
        }

        // B) Open traveling water-wave wake crests spawned along pointer trail
        for (let i = 0; i < wavePool.length; i++) {
          const w = wavePool[i];
          if (!w.active) continue;
          const age = now - w.bornAt;
          if (age >= w.duration) {
            w.active = false;
            continue;
          }

          const p = age / w.duration;
          const easeOut = 1 - Math.pow(1 - p, 2.1);
          const spanHalf = 36 + easeOut * w.maxRadius * 1.1;
          const fade = Math.pow(1 - p, 1.5) * w.strength * pointerActiveAlpha;
          if (fade <= 0.01) continue;

          // Draw paired top & bottom open wave arcs drifting apart vertically
          for (let dir = -1; dir <= 1; dir += 2) {
            const yShift = dir * (6 + easeOut * 34);
            const yBase = w.y + yShift;
            const wxStart = w.x - spanHalf;
            const wxEnd = w.x + spanHalf;

            const wakeGrad = ctx.createLinearGradient(wxStart, yBase, wxEnd, yBase);
            const wakeRgb = isDark ? '186, 230, 253' : '37, 99, 235';
            wakeGrad.addColorStop(0, `rgba(${wakeRgb}, 0)`);
            wakeGrad.addColorStop(0.5, `rgba(${wakeRgb}, ${(fade * 0.36).toFixed(3)})`);
            wakeGrad.addColorStop(1, `rgba(${wakeRgb}, 0)`);

            ctx.strokeStyle = wakeGrad;
            ctx.lineWidth = Math.max(0.75, (1 - p * 0.45) * 1.4);
            ctx.beginPath();

            const step = 6;
            for (let x = wxStart; x <= wxEnd; x += step) {
              const norm = (x - w.x) / spanHalf;
              const env = Math.max(0, 1 - norm * norm);
              const waveY =
                yBase +
                Math.sin(norm * Math.PI * 2.5 - t * 5.2 + w.phaseOffset) *
                  (5.5 * (1 - p * 0.4) * env);
              if (x === wxStart) ctx.moveTo(x, waveY);
              else ctx.lineTo(x, waveY);
            }
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    };

    const removeEffect = addFrameEffect(15, render);

    return () => {
      removeEffect();
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Base Background Surface matching Light Sky / Dark Cobalt Reference */}
      <div
        className="fixed inset-0 transition-colors duration-300"
        style={{
          background:
            theme === 'dark'
              ? 'linear-gradient(155deg, #091559 0%, #060D3D 52%, #04092B 100%)'
              : 'linear-gradient(155deg, #BEE0FA 0%, #CEE8FC 50%, #C2E2FA 100%)',
        }}
      />

      {/* Soft Light Caustic Circles, Video-Like Hero Falling Stars & Fluid Cursor Waves */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Smooth Cursor-Following Radial Illumination */}
        <div ref={glowRef} className="absolute inset-0 will-change-[background]" />

        {/* Dynamic Background Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* Vertical Hairline Lines with Clean 10px Space around Each Star Intersection */}
      {colPcts.map((pct, colIdx) => (
        <div
          key={`col-${colIdx}`}
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: `${pct}%`,
            background: `repeating-linear-gradient(to bottom, var(--border-color) 0px, var(--border-color) calc(${rowHeight}px - 20px), transparent calc(${rowHeight}px - 20px), transparent ${rowHeight}px)`,
            backgroundPositionY: `${topOffset + 10}px`,
          }}
        />
      ))}

      {/* Horizontal Hairline Lines with Exact Aligned Segments & 10px Gap around Every Intersection */}
      {Array.from({ length: Math.ceil(docHeight / rowHeight) }).map((_, rowIdx) => {
        const y = rowIdx * rowHeight + topOffset;
        const segments = [
          { left: '0px', right: 'calc(97.5% + 10px)' },
          { left: 'calc(2.5% + 10px)', right: 'calc(65.5% + 10px)' },
          { left: 'calc(34.5% + 10px)', right: 'calc(33.5% + 10px)' },
          { left: 'calc(66.5% + 10px)', right: 'calc(2.5% + 10px)' },
          { left: 'calc(97.5% + 10px)', right: '0px' },
        ];

        return (
          <div
            key={`row-${rowIdx}`}
            className="absolute left-0 right-0 h-px"
            style={{ top: `${y}px` }}
          >
            {segments.map((seg, segIdx) => (
              <div
                key={segIdx}
                className="absolute top-0 bottom-0"
                style={{
                  left: seg.left,
                  right: seg.right,
                  backgroundColor: 'var(--border-color)',
                }}
              />
            ))}
          </div>
        );
      })}

      {/* 4-Point '+'-Shaped Star Intersections */}
      {gridPoints.map((pt, idx) => (
        <div
          key={idx}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center select-none"
          style={{
            left: `${pt.x}%`,
            top: `${pt.y}px`,
          }}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <svg
              width="11"
              height="11"
              viewBox="0 0 16 16"
              fill="currentColor"
              style={{ color: 'var(--crosshair-color)' }}
              aria-hidden="true"
            >
              <path d="M8 0.5 L9.4 6.6 L15.5 8 L9.4 9.4 L8 15.5 L6.6 9.4 L0.5 8 L6.6 6.6 Z" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
