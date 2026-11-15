import { ReactNode, useEffect } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { bindLenisScrollBus, runFrameEffects } from '../lib/lenisScrollBus';

gsap.registerPlugin(ScrollTrigger);

const LENIS_OPTIONS = {
  autoRaf: false,
  lerp: 0.048,
  duration: 1.85,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical' as const,
  gestureOrientation: 'vertical' as const,
  smoothWheel: true,
  syncTouch: true,
  wheelMultiplier: 0.52,
  touchMultiplier: 0.88,
  anchors: { duration: 1.5 },
};

function LenisScrollEnvBridge() {
  const lenis = useLenis();

  useEffect(() => {
    bindLenisScrollBus(lenis ?? null);
    return () => bindLenisScrollBus(null);
  }, [lenis]);

  useEffect(() => {
    if (!lenis) return;

    let rafId = 0;
    let lastTime = performance.now();

    const frame = (time: number) => {
      const deltaSec = Math.min(Math.max((time - lastTime) / 1000, 1 / 240), 0.1);
      lastTime = time;

      // 1. Advance Lenis & update DOM + ScrollBus snapshot first
      lenis.raf(time);

      // 2. Sync GSAP ScrollTrigger with fresh scroll position in the same frame
      ScrollTrigger.update();

      // 3. Run DOM velocity effects (priority 10) and WebGL renders (priority 20)
      runFrameEffects(time, deltaSec);

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [lenis]);

  return null;
}

export function ScrollRoot({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      <LenisScrollEnvBridge />
      {children}
    </ReactLenis>
  );
}
