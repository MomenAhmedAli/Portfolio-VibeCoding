import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Project } from '../types';
import { ArrowUpRight } from 'lucide-react';
import { DotMatrixHoverOverlay } from './DotMatrixHoverOverlay';
import { RollingNumber } from './TypewriterEffects';
import { DomSyncWebGL, DomSyncProjectSpec } from './DomSyncWebGL';
import { ProjectLogoReveal } from './ProjectLogoReveal';

gsap.registerPlugin(ScrollTrigger);

interface SelectedWorkSectionProps {
  onSelectProject: (project: Project) => void;
  theme?: 'light' | 'dark';
}

interface WorkItem extends Project {
  imageSrc: string;
  hoverImageSrc: string;
  indexCode: string;
  shortLabel: string;
}

export const PROJECTS_DATA: WorkItem[] = [
  {
    id: 'nurabi',
    indexCode: '3/2',
    title: 'NURABI',
    shortLabel: 'PRIVATE TUTORING PLATFORM',
    category: 'WEBSITE',
    years: '2025-2027',
    tagline: 'منصتك المفضلة للحصول على دروس خصوصية عالية الجودة',
    description:
      'An all-in-one private tutoring and live session platform crafted for the MENA region with rich Arabic typography, interactive teacher matching, and seamless booking calendar.',
    tags: ['Web Design', 'Arabic Typography', 'EdTech SaaS', 'Design System'],
    role: 'Lead UI/UX & Design Systems',
    deliverables: [
      'Web Portal Architecture',
      'RTL Arabic Typography Engine',
      'Booking & Schedule Calendar',
      'Interactive Video Class HUD',
    ],
    metrics: ['+140% Booking Conversion', '4.9★ Tutor Satisfaction', '350K+ Monthly Learners'],
    colorTheme: 'from-[#0b3b60] via-[#092947] to-[#041526]',
    accentBg: '#092b4a',
    previewType: 'arabic-edtech',
    imageSrc: '/assets/aistudio/project_nurabi.png',
    hoverImageSrc: '/assets/aistudio/nurabi_2fac4ca4.png',
  },
  {
    id: 'rivka',
    indexCode: '3/3',
    title: 'RIVKA',
    shortLabel: 'WILDERNESS CAMPSITE EXPEDITION',
    category: 'MOBILE APP',
    years: '2025-2026',
    tagline: "Find your camp in Egypt's wild places",
    description:
      'A mobile-first expedition and wilderness campsite discovery app connecting adventurous travelers with authentic Bedouin hosts across Dahab, Siwa Oasis, and the White Desert.',
    tags: ['Mobile iOS / Android', 'Design System', 'GPS & Offline Maps', '3D Terrain Mockups'],
    role: 'Principal Mobile Product Designer',
    deliverables: [
      'iOS & Android Design Guidelines',
      'Campsite Discovery Feed',
      'Offline Route Navigator',
      'Host Verification Engine',
    ],
    metrics: ['85K Active Campers', '4.8★ App Store Rating', '98% Positive Host Sentiment'],
    colorTheme: 'from-[#be976b] via-[#a3794f] to-[#7a5530]',
    accentBg: '#96714a',
    previewType: 'desert-app',
    imageSrc: '/assets/aistudio/project_rivka.png',
    hoverImageSrc: '/assets/aistudio/rivka_a6cdcbf7.png',
  },
  {
    id: 'simulation-game',
    indexCode: '3/4',
    title: 'SIMULATION GAME',
    shortLabel: 'ROBLOX SUPPORTAL ECONOMY & HUD',
    category: 'ROBLOX UI',
    years: '2025',
    tagline: 'Supportal Game Economy & In-App Shop Interface',
    description:
      'Complete UI/UX overhaul of a Roblox simulation game HUD including Cash Display, Live Stack Meter, and Ability Controls. Balances playful reward psychology with clean purchase flows.',
    tags: ['Roblox UI / UX', 'Virtual Economy', 'HUD Animation', 'Ability Controls'],
    role: 'Game Interface Designer',
    deliverables: [
      'Roblox In-Game HUD Architecture',
      'Cash & Gems Currency Display',
      'Live Stack Meter & Ability Buttons',
      'Sound Effect & Haptic Specs',
    ],
    metrics: ['+28% ARPPU Increase', '+42% Starter Bundle Adoption', '60fps Canvas Performance'],
    colorTheme: 'from-[#1e1b4b] via-[#2e1065] to-[#172554]',
    accentBg: '#2a1a4e',
    previewType: 'game-hud',
    imageSrc: '/assets/aistudio/project_game.png',
    hoverImageSrc: '/assets/aistudio/Frame_24_36a25a33.png',
  },
];

export function SelectedWorkSection({ onSelectProject, theme = 'dark' }: SelectedWorkSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imageBoxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const modalTimerRef = useRef<number | null>(null);
  const lastWaveAtRef = useRef<number>(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [waveTriggers, setWaveTriggers] = useState<Record<string, number>>({});
  const [webglReady, setWebglReady] = useState(false);

  const projectSpecs: DomSyncProjectSpec[] = useMemo(
    () =>
      PROJECTS_DATA.map((project) => ({
        id: project.id,
        imageSrc: project.imageSrc,
      })),
    []
  );

  useEffect(() => {
    const ctx = gsap.context(() => {
      const headerTween = gsap.fromTo(
        '[data-work-header]',
        { y: 36, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          ease: 'power3.out',
          paused: true,
        }
      );

      ScrollTrigger.create({
        trigger: '[data-work-header]',
        start: 'top 90%',
        end: 'bottom 8%',
        onEnter: () => headerTween.restart(),
        onLeave: () => headerTween.reverse(),
        onEnterBack: () => headerTween.restart(),
        onLeaveBack: () => headerTween.reverse(),
      });

      cardRefs.current.forEach((cardEl) => {
        if (!cardEl) return;

        // Crisp, fast entrance (card header + image together) as soon as scroll nears the card,
        // matching the Hero portrait entrance speed, and reversible when scrolling back above.
        const enterTween = gsap.fromTo(
          cardEl,
          { y: 36, scale: 0.98, opacity: 0 },
          {
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 0.52,
            ease: 'power3.out',
            paused: true,
          }
        );

        ScrollTrigger.create({
          trigger: cardEl,
          start: 'top 95%',
          end: 'bottom top',
          onEnter: () => enterTween.play(),
          onEnterBack: () => enterTween.play(),
          onLeaveBack: () => enterTween.reverse(),
        });
      });
    }, sectionRef);

    return () => {
      ctx.revert();
      if (modalTimerRef.current) {
        window.clearTimeout(modalTimerRef.current);
      }
    };
  }, []);

  const triggerWave = (projectId: string) => {
    const now = performance.now();
    if (now - lastWaveAtRef.current < 180) return;
    lastWaveAtRef.current = now;
    setWaveTriggers((prev) => ({
      ...prev,
      [projectId]: (prev[projectId] || 0) + 1,
    }));
  };

  const handleCardClick = (project: WorkItem) => {
    triggerWave(project.id);
    if (modalTimerRef.current) {
      window.clearTimeout(modalTimerRef.current);
    }
    modalTimerRef.current = window.setTimeout(() => {
      onSelectProject(project);
    }, 360);
  };

  return (
    <section
      id="work"
      ref={sectionRef}
      className="w-full py-20 sm:py-28 px-6 sm:px-12 lg:px-20 relative z-10"
    >
      {/* DOM-Synced WebGL Shader Canvas (velocity curl + directional top/bottom 3D lift + wave ripple) */}
      <DomSyncWebGL
        projects={projectSpecs}
        imageBoxRefs={imageBoxRefs}
        cardRefs={cardRefs}
        hoveredId={hoveredId}
        pressedId={pressedId}
        waveTriggers={waveTriggers}
        onReadyChange={setWebglReady}
      />

      <div className="max-w-5xl mx-auto relative z-20">
        {/* Section Header */}
        <div data-work-header className="flex items-baseline justify-between mb-14 sm:mb-20 relative z-20">
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter uppercase font-sans">
            SELECTED WORK
          </h2>
          <span className="font-pixel text-xs sm:text-sm font-semibold opacity-75 tracking-tight shrink-0 inline-flex items-baseline">
            <span>//</span>
            <RollingNumber value="02" />
          </span>
        </div>

        {/* Alternating One-by-One Rectangular Sequence: Left -> Right -> Left */}
        <div data-scroll-shift className="relative z-20 flex flex-col space-y-14 sm:space-y-20 will-change-transform">
          {PROJECTS_DATA.map((project, idx) => {
            const isLeft = idx % 2 === 0;
            const isHovered = hoveredId === project.id;
            const isPressed = pressedId === project.id;

            const fallbackZoomClass = isPressed
              ? 'scale-[0.985]'
              : isHovered
              ? 'scale-[1.06]'
              : 'scale-100';

            return (
              <div
                key={project.id}
                id={`project-${project.id}`}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                onClick={() => handleCardClick(project)}
                onMouseEnter={() => setHoveredId(project.id)}
                onMouseLeave={() => {
                  setHoveredId(null);
                  setPressedId(null);
                }}
                onMouseDown={() => {
                  setPressedId(project.id);
                  triggerWave(project.id);
                }}
                onMouseUp={() => setPressedId(null)}
                className={`group w-full md:w-[68%] lg:w-[64%] cursor-pointer select-none will-change-transform ${
                  isLeft ? 'md:self-start' : 'md:self-end'
                }`}
              >
                {/* Sharp 0px-Radius Rectangular Image Frame (NEVER grows in outer dimensions on hover/press) */}
                <div
                  ref={(el) => {
                    imageBoxRefs.current[idx] = el;
                  }}
                  className={`relative w-full aspect-[16/10] overflow-hidden rounded-none ${
                    webglReady ? 'bg-transparent' : 'bg-[#141416]'
                  }`}
                >
                  {/* Image 1 Fallback (darkens and zooms strictly inside fixed frame) */}
                  <img
                    src={project.imageSrc}
                    alt={`${project.title} — ${project.category}`}
                    className={`w-full h-full object-cover rounded-none transition-[transform,filter] duration-500 ease-out ${fallbackZoomClass} ${
                      isHovered ? 'brightness-[0.22]' : 'brightness-100'
                    } ${webglReady ? 'opacity-0' : 'opacity-100'}`}
                  />

                  {/* Inside-Image Minimal Bottom-Left Overlay: Category + Title + Arrow Only (no top bar, no dates) */}
                  <div
                    className={`absolute inset-0 z-20 pointer-events-none flex flex-col justify-end p-4 sm:p-5 bg-gradient-to-t from-black/65 via-black/15 to-transparent transition-opacity duration-300 ${
                      isHovered ? 'opacity-0' : 'opacity-100'
                    }`}
                  >
                    <div className="flex flex-col items-start gap-1 text-white">
                      <span className="font-pixel text-[9px] sm:text-[10px] tracking-wider uppercase text-white/75">
                        {project.category}
                      </span>
                      <div className="inline-flex items-center gap-1.5 font-sans font-bold text-sm sm:text-base tracking-tight uppercase">
                        <span>{project.title}</span>
                        <ArrowUpRight className="w-4 h-4 shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Dot-Matrix Transition Pulse Layer */}
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    <DotMatrixHoverOverlay isHovered={isHovered} />
                  </div>

                  {/* Subtle Darkening Veil between Image 1 and Image 2 transition */}
                  <div
                    className={`absolute inset-0 z-20 pointer-events-none bg-black/55 transition-opacity duration-300 ${
                      isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                  />

                  {/* Image 2: Uploaded Hover Image (Nurabi -> Rivka -> Roblox Supportal) + 3px Center Wave */}
                  <ProjectLogoReveal
                    projectId={project.id}
                    title={project.title}
                    category={project.category}
                    hoverImageSrc={project.hoverImageSrc}
                    isHovered={isHovered}
                    isPressed={isPressed}
                    waveTrigger={waveTriggers[project.id] || 0}
                    theme={theme}
                  />
                </div>

                {/* Below Image (Outside Image Frame): Project Name & Date ONLY */}
                <div className="mt-3 flex items-baseline justify-between gap-4">
                  <h3 className="text-sm sm:text-base font-bold tracking-tight uppercase font-sans transition-opacity duration-200 group-hover:opacity-80">
                    {project.title}
                  </h3>
                  <span className="font-pixel text-[11px] sm:text-xs opacity-70 tabular-nums shrink-0">
                    {project.years}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quiet Unboxed Helper Caption */}
        <div className="mt-14 flex items-center justify-center gap-2 text-[10px] font-pixel opacity-60 relative z-20">
          <span>+</span>
          <span>CLICK ANY PROJECT TO INSPECT CASE STUDY</span>
        </div>
      </div>
    </section>
  );
}
