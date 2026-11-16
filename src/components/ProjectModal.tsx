import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { ArrowLeft } from 'lucide-react';
import { Project } from '../types';
import { TypewriterText } from './TypewriterEffects';

interface ProjectModalProps {
  project: Project | null;
  projects: Project[];
  theme?: 'light' | 'dark';
  onSelectProject: (project: Project) => void;
  onClose: () => void;
}

export function ProjectModal({
  project,
  theme = 'dark',
  onClose,
}: ProjectModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(1600);

  const rowHeight = 320;
  const topOffset = 46;
  const colPcts = [2.5, 34.5, 66.5, 97.5];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Scoped Lenis smooth scrolling inside the detail page wrapper
  useEffect(() => {
    const wrapper = scrollContainerRef.current;
    const content = scrollContentRef.current;
    if (!project || !wrapper || !content) return;

    wrapper.scrollTop = 0;

    const modalLenis = new Lenis({
      wrapper,
      content,
      smoothWheel: true,
      lerp: 0.09,
    });

    let rafId = 0;
    const onRaf = (time: number) => {
      modalLenis.raf(time);
      rafId = window.requestAnimationFrame(onRaf);
    };
    rafId = window.requestAnimationFrame(onRaf);

    const updateHeight = () => {
      const h = Math.max(content.scrollHeight, window.innerHeight * 1.4, 1400);
      setContentHeight(h);
    };
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);
    window.addEventListener('resize', updateHeight);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
      modalLenis.destroy();
    };
  }, [project]);

  if (!project) return null;

  const isDark = theme === 'dark';
  const rowsCount = Math.ceil(contentHeight / rowHeight);
  const gridPoints: { x: number; y: number }[] = [];
  for (let r = 0; r <= rowsCount; r++) {
    const y = r * rowHeight + topOffset;
    colPcts.forEach((pct) => {
      gridPoints.push({ x: pct, y });
    });
  }

  return (
    <div
      ref={scrollContainerRef}
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} (${project.arabicTitle}) Case Study Page`}
      className="fixed inset-0 z-50 overflow-y-auto transition-colors duration-300"
      style={{
        background: isDark
          ? 'linear-gradient(155deg, #091559 0%, #060D3D 52%, #071048 100%)'
          : 'linear-gradient(155deg, #BEE0FA 0%, #CEE8FC 50%, #C2E2FA 100%)',
        color: 'var(--text-color)',
      }}
    >
      <div ref={scrollContentRef} className="relative min-h-full w-full">
        {/* Full-Page Architectural Segmented Grid + 4-Point Star '+' Intersections (Matches Landing Page) */}
        <div
          className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
          style={{ minHeight: `${contentHeight}px` }}
          aria-hidden="true"
        >
          {/* Vertical Grid Lines with 20px Gap Cutouts at Intersections */}
          {colPcts.map((pct, colIdx) => (
            <div
              key={`modal-col-${colIdx}`}
              className="absolute top-0 bottom-0 w-px"
              style={{
                left: `${pct}%`,
                background: `repeating-linear-gradient(to bottom, var(--border-color) 0px, var(--border-color) calc(${rowHeight}px - 20px), transparent calc(${rowHeight}px - 20px), transparent ${rowHeight}px)`,
                backgroundPositionY: `${topOffset + 10}px`,
              }}
            />
          ))}

          {/* Horizontal Segmented Grid Rows */}
          {Array.from({ length: rowsCount + 1 }).map((_, rowIdx) => {
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
                key={`modal-row-${rowIdx}`}
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

          {/* 4-Point '+' Star SVG Markers at Every Grid Intersection */}
          {gridPoints.map((pt, idx) => (
            <div
              key={`star-${idx}`}
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

        {/* Sticky Minimal Header: Left (Moamen. + Back directly below) | Right (Active Project Underscored) */}
        <header className="sticky top-0 z-30 pt-3 sm:pt-4 pb-2 px-[2.5%] sm:px-[3.5%] backdrop-blur-sm">
          <div className="w-full grid grid-cols-12 items-start">
            {/* Left: Brand Wordmark + Back directly underneath */}
            <div className="col-span-6 flex flex-col items-start gap-1">
              <button
                type="button"
                onClick={onClose}
                className="font-editorial font-medium text-2xl sm:text-[26px] tracking-tight leading-none hover:opacity-75 transition-opacity cursor-pointer"
              >
                Moamen.
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] tracking-tight opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" aria-hidden="true" />
                <span>Back</span>
              </button>
            </div>

            {/* Right: Only Active Project Label with Underscore / Underline */}
            <div className="col-span-6 flex items-center justify-end pt-1 font-sans text-xs sm:text-sm font-medium tracking-tight">
              <span dir="rtl" className="underline underline-offset-4 opacity-90">
                _{project.arabicTitle}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Flow Over Architectural Grid */}
        <main className="relative z-10 max-w-5xl mx-auto px-5 sm:px-10 pt-10 sm:pt-14 pb-24 space-y-12 sm:space-y-16">
          {/* Centered Paired Heading */}
          <section className="text-center flex flex-col items-center justify-center space-y-4">
            <div className="font-pixel text-[10px] sm:text-[11px] uppercase tracking-[0.2em] opacity-70">
              <span>// {project.category} · {project.years}</span>
            </div>

            <h1 className="flex flex-wrap items-baseline justify-center gap-x-4 sm:gap-x-6 gap-y-2 leading-none">
              <span className="font-editorial font-medium text-5xl sm:text-7xl lg:text-[78px] tracking-tight uppercase">
                <TypewriterText
                  key={`en-title-${project.id}`}
                  text={project.title}
                  speedMs={45}
                  delayMs={0}
                  startOnView={false}
                  showCursor={false}
                />
              </span>
              <span className="font-editorial text-3xl sm:text-5xl opacity-30" aria-hidden="true">
                /
              </span>
              <span
                dir="rtl"
                className="font-sans font-black text-4xl sm:text-6xl lg:text-[66px] tracking-tight"
              >
                <TypewriterText
                  key={`ar-title-${project.id}`}
                  text={project.arabicTitle}
                  speedMs={65}
                  delayMs={0}
                  startOnView={false}
                  showCursor={false}
                />
              </span>
            </h1>

            <p dir="rtl" className="font-sans text-xs sm:text-sm opacity-75 max-w-xl mx-auto leading-relaxed">
              <TypewriterText
                key={`tagline-${project.id}`}
                text={project.tagline}
                speedMs={16}
                delayMs={0}
                startOnView={false}
                showCursor={false}
              />
            </p>
          </section>

          {/* ONE Single Gray ('رصاصي') Rounded-[20px] Details Box with ONLY 2 Layouts Typing Together Simultaneously */}
          <section
            aria-label="Platform details"
            className="max-w-4xl mx-auto rounded-[20px] border p-6 sm:p-10 lg:p-12 space-y-8"
            style={{
              borderColor: isDark ? 'rgba(156, 163, 175, 0.32)' : 'rgba(107, 114, 128, 0.35)',
              backgroundColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.24)',
            }}
          >
            {/* Layout 1 (First): Platform Story & Purpose */}
            <div dir="rtl" className="text-right space-y-4">
              <div className="font-pixel text-[10px] uppercase tracking-[0.18em] opacity-60" dir="ltr">
                01 // PLATFORM STORY &amp; PURPOSE
              </div>
              <p className="font-sans text-lg sm:text-2xl font-medium leading-[1.75] min-h-[5rem]">
                <TypewriterText
                  key={`narrative-${project.id}`}
                  text={project.writtenNarrative}
                  speedMs={14}
                  delayMs={0}
                  startOnView={false}
                  showCursor={true}
                />
              </p>
              <p className="font-sans text-xs sm:text-sm opacity-80 leading-relaxed">
                <TypewriterText
                  key={`desc-${project.id}`}
                  text={project.description}
                  speedMs={14}
                  delayMs={0}
                  startOnView={false}
                  showCursor={false}
                />
              </p>
            </div>

            {/* Layout 2 (Second): Launch Date, Grade Stages / Scope, Appointment System & Platform Status */}
            <div
              dir="rtl"
              className="pt-7 border-t text-right"
              style={{ borderColor: isDark ? 'rgba(156, 163, 175, 0.24)' : 'rgba(107, 114, 128, 0.26)' }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {project.scheduleTiles.map((tile, idx) => (
                  <div key={`${project.id}-meta-${idx}`} className="space-y-1.5">
                    <div className="font-sans text-[11px] opacity-65">
                      <TypewriterText
                        key={`tile-lbl-${project.id}-${idx}`}
                        text={tile.label}
                        speedMs={28}
                        delayMs={0}
                        startOnView={false}
                        showCursor={false}
                      />
                    </div>
                    <div className="font-sans text-xs sm:text-sm font-bold leading-snug">
                      <TypewriterText
                        key={`tile-val-${project.id}-${idx}`}
                        text={tile.value}
                        speedMs={24}
                        delayMs={0}
                        startOnView={false}
                        showCursor={false}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Clean Unboxed 0px-Radius Visual Frames Matching Landing Page Work Grid */}
          <section aria-label="Project visual interfaces" className="space-y-10 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <figure className="space-y-2.5">
                <div className="w-full aspect-[16/10] overflow-hidden rounded-none">
                  <img
                    src={project.imageSrc}
                    alt={`${project.title} main showcase interface`}
                    className="w-full h-full object-cover block rounded-none"
                  />
                </div>
                <figcaption className="flex items-baseline justify-between font-pixel text-[10px] uppercase opacity-70">
                  <span>{project.title} // PRIMARY VIEW</span>
                  <span>{project.years}</span>
                </figcaption>
              </figure>

              <figure className="space-y-2.5">
                <div className="w-full aspect-[16/10] overflow-hidden rounded-none">
                  <img
                    src={project.hoverImageSrc}
                    alt={`${project.title} identity and system view`}
                    className="w-full h-full object-cover block rounded-none"
                  />
                </div>
                <figcaption className="flex items-baseline justify-between font-pixel text-[10px] uppercase opacity-70">
                  <span dir="rtl">{project.arabicTitle} // IDENTITY &amp; SYSTEM</span>
                  <span>{project.category}</span>
                </figcaption>
              </figure>
            </div>
          </section>

          {/* Single Centered Bottom Action: Back to Home Page */}
          <footer
            className="max-w-4xl mx-auto pt-8 border-t flex items-center justify-center"
            style={{ borderColor: isDark ? 'rgba(156, 163, 175, 0.24)' : 'rgba(107, 114, 128, 0.24)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 font-pixel text-[11px] sm:text-xs uppercase tracking-[0.16em] border-b border-current pb-1 opacity-85 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>BACK TO HOME PAGE</span>
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}
