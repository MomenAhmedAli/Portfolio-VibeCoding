import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowUpRight } from 'lucide-react';

interface ProjectLogoRevealProps {
  projectId: string;
  title: string;
  category: string;
  hoverImageSrc: string;
  isHovered: boolean;
  isPressed: boolean;
  waveTrigger: number;
  theme?: 'light' | 'dark';
}

/**
 * Expanding 3px circular wave line + echo ring radiating from exact center (50%, 50%)
 * all the way out past the image borders when pressed/clicked.
 */
function CenterWaveOverlay({
  trigger,
  isLightPlate,
}: {
  trigger: number;
  isLightPlate: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainRingRef = useRef<HTMLDivElement>(null);
  const echoRingRef = useRef<HTMLDivElement>(null);
  const glowRingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trigger <= 0) return;

    const main = mainRingRef.current;
    const echo = echoRingRef.current;
    const glow = glowRingRef.current;
    if (!main || !echo || !glow) return;

    const ctx = gsap.context(() => {
      gsap.killTweensOf([main, echo, glow]);

      // Primary bold ~3px wave crest expanding from exact center to outer bounds
      gsap.fromTo(
        main,
        { scale: 0.02, opacity: 0.96 },
        { scale: 1.55, opacity: 0, duration: 0.62, ease: 'power2.out' }
      );

      // Soft translucent water-wave band following behind the 3px crest
      gsap.fromTo(
        glow,
        { scale: 0.02, opacity: 0.55 },
        { scale: 1.55, opacity: 0, duration: 0.62, ease: 'power2.out' }
      );

      // Secondary trailing harmonic wave line
      gsap.fromTo(
        echo,
        { scale: 0.02, opacity: 0.72 },
        { scale: 1.45, opacity: 0, duration: 0.68, delay: 0.07, ease: 'power2.out' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [trigger]);

  const strokeColor = isLightPlate ? '#111111' : '#FFFFFF';
  const glowColor = isLightPlate ? 'rgba(17, 17, 17, 0.16)' : 'rgba(255, 255, 255, 0.24)';

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center overflow-hidden"
    >
      {/* Translucent Radial Wave Crest Band */}
      <div
        ref={glowRingRef}
        className="w-[125%] aspect-square rounded-full opacity-0 will-change-transform"
        style={{
          border: `16px solid ${glowColor}`,
        }}
      />

      {/* Primary 3.5px Solid Wave Line from Center to Edge */}
      <div
        ref={mainRingRef}
        className="absolute w-[125%] aspect-square rounded-full opacity-0 will-change-transform"
        style={{
          border: `3.5px solid ${strokeColor}`,
        }}
      />

      {/* Secondary Harmonic Wave Echo */}
      <div
        ref={echoRingRef}
        className="absolute w-[125%] aspect-square rounded-full opacity-0 will-change-transform"
        style={{
          border: `2px solid ${strokeColor}`,
        }}
      />
    </div>
  );
}

/**
 * Second visual layer revealed inside each project frame on hover:
 * Crossfades cleanly from the darkened Image 1 to the project's dedicated second image
 * (Nurabi logo, Rivka logo, and Roblox Supportal UI), zooms strictly inside fixed bounds,
 * and plays a 3px center-to-edge wave ripple on press/click.
 */
export function ProjectLogoReveal({
  projectId,
  title,
  category,
  hoverImageSrc,
  isHovered,
  isPressed,
  waveTrigger,
}: ProjectLogoRevealProps) {
  // Nurabi & Rivka hover images have a warm light Sand (#E8E8E6) background, so use dark ink labels;
  // Supportal (Roblox) has a bright outdoor 3D background, so use crisp white text with bottom scrim.
  const isLightSandHover = projectId === 'nurabi' || projectId === 'rivka';

  const zoomClass = isPressed
    ? 'scale-[0.96]'
    : isHovered
    ? 'scale-[1.045]'
    : 'scale-[0.94]';

  return (
    <>
      <div
        className={`absolute inset-0 z-30 pointer-events-none transition-opacity duration-500 ease-out ${
          isHovered ? 'opacity-100 delay-75' : 'opacity-0 delay-0'
        }`}
      >
        {/* Inner Hover Image Layer (scales strictly within overflow-hidden container) */}
        <img
          src={hoverImageSrc}
          alt={`${title} — Alternate View`}
          className={`w-full h-full object-cover rounded-none transition-transform duration-500 ease-out will-change-transform ${zoomClass}`}
        />

        {/* Minimal Bottom-Left Title + Arrow Only (no top bar, no dates) */}
        <div
          className={`absolute inset-0 flex flex-col justify-end p-4 sm:p-5 ${
            isLightSandHover
              ? 'text-[#111111]'
              : 'text-white bg-gradient-to-t from-black/65 via-black/15 to-transparent'
          }`}
        >
          <div className="flex flex-col items-start gap-1">
            <span
              className={`font-pixel text-[9px] sm:text-[10px] tracking-wider uppercase ${
                isLightSandHover ? 'text-[#111111]/65' : 'text-white/75'
              }`}
            >
              {category}
            </span>
            <div className="inline-flex items-center gap-1.5 font-sans font-bold text-sm sm:text-base tracking-tight uppercase">
              <span>{title}</span>
              <ArrowUpRight className="w-4 h-4 shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* 3px Center-to-Edge Wave Effect triggered on press/click */}
      <CenterWaveOverlay trigger={waveTrigger} isLightPlate={isLightSandHover && isHovered} />
    </>
  );
}
