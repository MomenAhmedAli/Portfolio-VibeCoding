import { useEffect, useRef, useState } from 'react';
import { addFrameEffect, getLenisScrollSnapshot } from '../lib/lenisScrollBus';

interface DualCompassScrollRailProps {
  onScrollToProgress: (progress: number, immediate?: boolean) => void;
  theme?: 'light' | 'dark';
}

interface BearingStop {
  deg: number; // Continuous range: -80 (80° N) -> 0 (00° E/N) -> +190 (190° S)
  label?: string;
  major: boolean;
}

const MIN_DEG = -80; // 80° North
const MAX_DEG = 190; // 190° South
const TOTAL_SPAN = MAX_DEG - MIN_DEG; // 270° continuous sweep

const BEARING_STOPS: BearingStop[] = (() => {
  const stops: BearingStop[] = [];
  for (let d = MIN_DEG; d <= MAX_DEG; d += 5) {
    const isCardinal = d === -80 || d === 0 || d === 90 || d === 190;
    const isMajor = d % 20 === 0 || isCardinal;
    let label: string | undefined;
    if (d < 0 && d % 40 === 0) {
      label = `${Math.abs(d)}°N`;
    } else if (d === 0) {
      label = '00°';
    } else if (d === 90) {
      label = '90°';
    } else if (d === 190) {
      label = '190°S';
    } else if (d > 0 && d % 40 === 0 && d !== 160) {
      label = `${d}°S`;
    }
    stops.push({ deg: d, label, major: isMajor });
  }
  return stops;
})();

function formatBearing(deg: number): string {
  const rounded = Math.round(deg);
  if (rounded < 0) return `${Math.abs(rounded)}°N`;
  if (rounded === 0) return '00°';
  return `${rounded}°S`;
}

export function DualCompassScrollRail({
  onScrollToProgress,
  theme = 'dark',
}: DualCompassScrollRailProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftTrackRef = useRef<HTMLDivElement>(null);
  const rightTrackRef = useRef<HTMLDivElement>(null);

  const [trackHeight, setTrackHeight] = useState(340);
  const activeSideRef = useRef<'left' | 'right' | null>(null);
  const isPressedRef = useRef(false);
  const hoveredSideRef = useRef<'left' | 'right' | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const onScrollRef = useRef(onScrollToProgress);
  onScrollRef.current = onScrollToProgress;

  // Larger responsive center-vertical compass height (~64% of viewport)
  useEffect(() => {
    const updateHeight = () => {
      const vh = window.innerHeight || 800;
      setTrackHeight(Math.round(Math.min(Math.max(vh * 0.64, 320), 580)));
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Drag/scrub listener when pressing either side compass rail
  useEffect(() => {
    const scrubFromClientY = (side: 'left' | 'right', clientY: number, immediate: boolean) => {
      const el = side === 'left' ? leftTrackRef.current : rightTrackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const rel = Math.min(Math.max((clientY - rect.top) / Math.max(rect.height, 1), 0), 1);
      onScrollRef.current(rel, immediate);
    };

    const handleMove = (e: PointerEvent) => {
      if (!isPressedRef.current || !activeSideRef.current) return;
      scrubFromClientY(activeSideRef.current, e.clientY, true);
    };

    const handleUp = () => {
      isPressedRef.current = false;
      activeSideRef.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, []);

  // Unified ScrollBus frame loop: renders both Left & Right compasses with top/bottom semicircular curl & auto-hide visibility
  useEffect(() => {
    let prevScrollY: number | null = null;
    let curlActivity = 0;
    let pressActivity = 0;
    let smoothProgress = 0;
    let visibilityAlpha = 0;
    let lastActiveTime = -9999;

    const drawCompassSide = (
      canvas: HTMLCanvasElement | null,
      side: 'left' | 'right',
      progress: number,
      curlStrength: number,
      pressBoost: number,
      isHovered: boolean
    ) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.clientWidth || 64;
      const h = canvas.clientHeight || 340;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const tw = Math.floor(w * dpr);
      const th = Math.floor(h * dpr);
      if (canvas.width !== tw || canvas.height !== th) {
        canvas.width = tw;
        canvas.height = th;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const isDark = themeRef.current === 'dark';
      const isLeft = side === 'left';

      // Center bearing driven steadily by scroll progress (80°N -> 190°S)
      const currentDeg = MIN_DEG + progress * TOTAL_SPAN;

      // Baseline horizontal spine X: inset in the middle so top & bottom curve OUTWARD toward screen edges
      const baseSpineX = isLeft ? Math.round(w * 0.34) : Math.round(w * 0.66);
      const rawOffset = 14 + curlStrength * 16 + pressBoost * 7;
      const maxCurveOffset = rawOffset * (isLeft ? -1 : 1);

      // Opposite outer semicircular curl profile: middle stays anchored, top & bottom flare outward!
      const getCurlMetrics = (yPx: number) => {
        const yNorm = (yPx / h) * 2 - 1; // -1 at top, +1 at bottom
        const clamped = Math.max(-1, Math.min(1, yNorm));
        const profile = 1 - Math.sqrt(Math.max(0, 1 - clamped * clamped));
        const spineX = Math.max(5, Math.min(w - 5, baseSpineX + profile * maxCurveOffset));
        const shadeAlpha = 1 - profile * 0.84;
        return { spineX, profile, shadeAlpha, yNorm: clamped };
      };

      // 1. Fully transparent backdrop (0% fill / no white tint), drawing only the crisp curved meridian line
      ctx.save();
      const samples = 32;
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const y = (i / samples) * h;
        const { spineX } = getCurlMetrics(y);
        if (i === 0) ctx.moveTo(spineX, y);
        else ctx.lineTo(spineX, y);
      }
      const lineGrad = ctx.createLinearGradient(0, 0, 0, h);
      const baseRgb = isDark ? '244, 246, 255' : '13, 17, 23';
      const hoverBoost = isHovered ? 0.16 : 0;
      lineGrad.addColorStop(0, `rgba(${baseRgb}, 0.04)`);
      lineGrad.addColorStop(0.5, `rgba(${baseRgb}, ${(0.38 + hoverBoost).toFixed(2)})`);
      lineGrad.addColorStop(1, `rgba(${baseRgb}, 0.04)`);
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1.15;
      ctx.stroke();
      ctx.restore();

      // 2. Render Moving Graduated Degree Ticks & Cardinal Bearings (-80°N ... 190°S)
      const pxPerDeg = 3.45;
      const centerY = h * 0.5;
      const dir = isLeft ? 1 : -1;

      ctx.font = '600 10.5px "IBM Plex Sans", system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = isLeft ? 'left' : 'right';

      for (let i = 0; i < BEARING_STOPS.length; i++) {
        const stop = BEARING_STOPS[i];
        const deltaDeg = stop.deg - currentDeg;
        const linearY = centerY + deltaDeg * pxPerDeg;

        // Cylindrical foreshortening near top & bottom edges
        const yNorm = Math.max(-1.05, Math.min(1.05, (linearY - centerY) / (h * 0.52)));
        if (Math.abs(yNorm) > 0.99) continue;

        const curvedY = centerY + Math.sin((yNorm * Math.PI) / 2) * (h * 0.475);
        const { spineX, shadeAlpha } = getCurlMetrics(curvedY);
        const squash = Math.cos((yNorm * Math.PI) / 2);
        const tickLen = (stop.major ? 16 : 8) * (0.45 + 0.55 * squash);
        const alpha = Math.max(0.05, shadeAlpha * (stop.major ? 0.85 : 0.42));

        ctx.strokeStyle = isDark
          ? `rgba(244, 246, 255, ${alpha.toFixed(3)})`
          : `rgba(13, 17, 23, ${alpha.toFixed(3)})`;
        ctx.lineWidth = stop.major ? 1.4 : 0.9;

        ctx.beginPath();
        ctx.moveTo(spineX, curvedY);
        ctx.lineTo(spineX + dir * tickLen, curvedY);
        ctx.stroke();

        if (stop.label && squash > 0.24) {
          ctx.fillStyle = isDark
            ? `rgba(244, 246, 255, ${(alpha * 0.96).toFixed(3)})`
            : `rgba(13, 17, 23, ${(alpha * 0.96).toFixed(3)})`;
          ctx.fillText(stop.label, spineX + dir * (tickLen + 5), curvedY);
        }
      }

      // 3. Center Fixed Compass Needle / Arrow & Active Bearing Readout
      const { spineX: midSpineX } = getCurlMetrics(centerY);
      const inkColor = isDark ? '#F4F6FF' : '#0D1117';

      // Crisp White triangular compass pointer pointing cleanly at the active degree
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(midSpineX + dir * 2, centerY);
      ctx.lineTo(midSpineX + dir * 13, centerY - 5);
      ctx.lineTo(midSpineX + dir * 13, centerY + 5);
      ctx.closePath();
      ctx.fill();
      if (!isDark) {
        ctx.strokeStyle = 'rgba(13, 17, 23, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Active degree badge beside the needle
      ctx.font = '700 11px "IBM Plex Sans", system-ui, sans-serif';
      ctx.fillStyle = inkColor;
      ctx.textAlign = isLeft ? 'left' : 'right';
      ctx.fillText(formatBearing(currentDeg), midSpineX + dir * 17, centerY);

      // Subtle North (top) & South (bottom) anchor markers inside the curved caps
      ctx.font = '700 9px "IBM Plex Sans", system-ui, sans-serif';
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.78)' : 'rgba(13, 17, 23, 0.75)';
      const topMetrics = getCurlMetrics(12);
      const botMetrics = getCurlMetrics(h - 12);
      ctx.fillText('N · 80°', topMetrics.spineX + dir * 5, 12);
      ctx.fillText('S · 190°', botMetrics.spineX + dir * 5, h - 12);
      ctx.restore();
    };

    const removeEffect = addFrameEffect(20, (timeMs, delta) => {
      const dt = Math.min(Math.max(delta, 1 / 240), 0.1);
      const snap = getLenisScrollSnapshot();
      const scrollY = snap.scrollTop;

      const deltaY = prevScrollY == null ? 0 : Math.abs(scrollY - prevScrollY);
      const velocity = deltaY / dt;
      prevScrollY = scrollY;

      const isScrolling = velocity > 4 || Math.abs(snap.velocity) > 0.05;
      const isInteracting = isScrolling || isPressedRef.current || hoveredSideRef.current !== null;
      if (isInteracting) {
        lastActiveTime = timeMs;
      }

      const shouldShow = isInteracting || timeMs - lastActiveTime < 1050;
      const targetVis = shouldShow ? 1 : 0;
      const visTau = targetVis > visibilityAlpha ? 0.08 : 0.28;
      visibilityAlpha += (targetVis - visibilityAlpha) * (1 - Math.exp(-dt / visTau));

      if (leftTrackRef.current) {
        leftTrackRef.current.style.opacity = visibilityAlpha.toFixed(3);
      }
      if (rightTrackRef.current) {
        rightTrackRef.current.style.opacity = visibilityAlpha.toFixed(3);
      }

      const targetCurl = Math.min(Math.max(velocity / 1150, 0), 1);
      const curlTau = targetCurl > curlActivity ? 0.14 : 0.44;
      curlActivity += (targetCurl - curlActivity) * (1 - Math.exp(-dt / curlTau));

      const targetPress = isPressedRef.current ? 1 : 0;
      const pressTau = targetPress > pressActivity ? 0.10 : 0.36;
      pressActivity += (targetPress - pressActivity) * (1 - Math.exp(-dt / pressTau));

      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const rawProg = Math.min(Math.max(scrollY / maxScroll, 0), 1);
      smoothProgress += (rawProg - smoothProgress) * (1 - Math.exp(-dt / 0.13));

      if (visibilityAlpha > 0.005) {
        drawCompassSide(
          leftCanvasRef.current,
          'left',
          smoothProgress,
          curlActivity,
          pressActivity,
          hoveredSideRef.current === 'left'
        );
        drawCompassSide(
          rightCanvasRef.current,
          'right',
          smoothProgress,
          curlActivity,
          pressActivity,
          hoveredSideRef.current === 'right'
        );
      }
    });

    return () => {
      removeEffect();
    };
  }, []);

  const handlePointerDown = (side: 'left' | 'right', clientY: number) => {
    isPressedRef.current = true;
    activeSideRef.current = side;
    const el = side === 'left' ? leftTrackRef.current : rightTrackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rel = Math.min(Math.max((clientY - rect.top) / Math.max(rect.height, 1), 0), 1);
    onScrollToProgress(rel, false);
  };

  return (
    <>
      {/* Left Center-Vertical Outward-Curved Transparent Compass Scrollbar */}
      <div
        ref={leftTrackRef}
        onMouseEnter={() => {
          hoveredSideRef.current = 'left';
        }}
        onMouseLeave={() => {
          hoveredSideRef.current = null;
        }}
        onPointerDown={(e) => handlePointerDown('left', e.clientY)}
        className="fixed left-0.5 sm:left-2.5 top-1/2 -translate-y-1/2 z-40 w-[72px] sm:w-[96px] cursor-ns-resize select-none"
        style={{ height: `${trackHeight}px`, opacity: 0 }}
        title="Compass Scroll Rail (80°N — 190°S)"
        aria-label="Left Compass Scroll Indicator"
      >
        <canvas ref={leftCanvasRef} className="w-full h-full block pointer-events-none" />
      </div>

      {/* Right Center-Vertical Outward-Curved Transparent Compass Scrollbar */}
      <div
        ref={rightTrackRef}
        onMouseEnter={() => {
          hoveredSideRef.current = 'right';
        }}
        onMouseLeave={() => {
          hoveredSideRef.current = null;
        }}
        onPointerDown={(e) => handlePointerDown('right', e.clientY)}
        className="fixed right-0.5 sm:right-2.5 top-1/2 -translate-y-1/2 z-40 w-[72px] sm:w-[96px] cursor-ns-resize select-none"
        style={{ height: `${trackHeight}px`, opacity: 0 }}
        title="Compass Scroll Rail (80°N — 190°S)"
        aria-label="Right Compass Scroll Indicator"
      >
        <canvas ref={rightCanvasRef} className="w-full h-full block pointer-events-none" />
      </div>
    </>
  );
}
