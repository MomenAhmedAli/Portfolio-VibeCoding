import { useEffect, useRef } from 'react';
import { addFrameEffect } from '../lib/lenisScrollBus';
import { createCircleFormation3D } from '../lib/circleFormation3D';
import {
  clamp,
  computeVoyageFrameState,
  computeVoyageSectionProgress,
} from '../lib/voyageChoreography';

interface ShipVoyageSectionProps {
  theme?: 'light' | 'dark';
}

export function ShipVoyageSection({ theme = 'dark' }: ShipVoyageSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const centerTextRef = useRef<HTMLDivElement>(null);
  const stageLabelRef = useRef<HTMLSpanElement>(null);

  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const section = sectionRef.current;
    const mount = canvasMountRef.current;
    if (!section || !mount) return;

    let vw = window.innerWidth;
    let vh = window.innerHeight;

    const formation3D = createCircleFormation3D(mount, vw, vh);
    if (!formation3D) return;

    const handleResize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      formation3D.resize(vw, vh);
    };

    window.addEventListener('resize', handleResize);

    let disposed = false;
    let hasInitialized = false;
    let smoothProgress = 0;
    let elapsedSec = 0;

    const removeEffect = addFrameEffect(20, (_timeMs, delta) => {
      if (disposed) return;

      const dt = Math.min(Math.max(delta, 1 / 240), 0.1);
      const rect = section.getBoundingClientRect();
      if (rect.bottom < -120 || rect.top > vh + 120) {
        hasInitialized = false;
        formation3D.clearCanvas();
        return;
      }

      const rawProgress = computeVoyageSectionProgress(rect.top, rect.height, vh);
      if (!hasInitialized || Math.abs(rawProgress - smoothProgress) > 0.18) {
        smoothProgress = rawProgress;
        hasInitialized = true;
      } else {
        const dampRate = rawProgress >= 0.85 ? 24 : 12;
        smoothProgress += (rawProgress - smoothProgress) * (1 - Math.exp(-dt * dampRate));
      }
      const state = computeVoyageFrameState(smoothProgress);

      const exitGuard =
        rawProgress > 0.72 ? clamp((rect.bottom - vh * 0.86) / (vh * 0.14), 0, 1) : 1;
      const effectiveCircleAlpha = state.circleAlpha * exitGuard;

      elapsedSec += dt * (1.0 + state.reassembleSurge * 1.4);

      if (centerTextRef.current) {
        centerTextRef.current.style.opacity = state.centerTextAlpha.toFixed(3);
        centerTextRef.current.style.transform = `translate3d(0, ${state.centerTextOffsetPx.toFixed(1)}px, 0)`;
      }
      if (stageLabelRef.current) {
        stageLabelRef.current.textContent = state.stageLabel;
      }

      formation3D.updateAndRender(
        state,
        effectiveCircleAlpha,
        elapsedSec,
        themeRef.current,
        vw,
        vh
      );
    });

    return () => {
      disposed = true;
      removeEffect();
      window.removeEventListener('resize', handleResize);
      formation3D.dispose();
    };
  }, []);

  return (
    <section
      id="ship-voyage"
      ref={sectionRef}
      aria-label="3D Sphere Shatter and Reassembly Choreography"
      className="relative w-full h-[360vh] z-10"
    >
      <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center">
        {/* Single 3D Fracturable Sphere Shader Canvas */}
        <div
          ref={canvasMountRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Quiet Top Stage Marker */}
        <div className="absolute top-28 sm:top-32 left-6 sm:left-12 right-6 sm:right-12 flex items-center justify-between font-pixel text-[10px] sm:text-xs uppercase pointer-events-none z-20">
          <span ref={stageLabelRef} className="opacity-75">
            01 // UNIFIED SPHERE
          </span>
          <span className="opacity-55 hidden sm:inline">COLLECTIVE FORM</span>
        </div>

        {/* Centered Editorial Copy Appearing Upon Reassembly (Design · Teamwork · Brand Design) */}
        <div
          ref={centerTextRef}
          className="relative z-20 px-6 max-w-2xl text-center pointer-events-none opacity-0 will-change-transform"
        >
          <span className="font-pixel text-[10px] sm:text-[11px] tracking-[0.26em] uppercase opacity-80 block mb-3">
            FUTURE DETAILS · DESIGN · TEAMWORK · BRAND DESIGN
          </span>
          <h3 className="font-editorial text-3xl sm:text-5xl lg:text-[54px] font-medium tracking-tight leading-[1.04]">
            Individual craft shatters silos.
            <br />
            Shared vision unites the brand.
          </h3>
          <p className="font-sans text-xs sm:text-sm opacity-80 mt-4 max-w-lg mx-auto leading-relaxed">
            From early UI/UX structure and brand systems to seamless cross-functional teamwork, every distinct piece snaps into one lasting digital product.
          </p>
        </div>
      </div>
    </section>
  );
}
