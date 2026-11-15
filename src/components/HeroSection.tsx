import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown } from 'lucide-react';
import { useLenis } from 'lenis/react';
import { ScrambleLines } from './ScrambleLines';
import { TypewriterGreetings8, TypewriterText } from './TypewriterEffects';
import { OrbitingInterfaces360 } from './OrbitingInterfaces360';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  scrollVelocity?: number;
  theme?: 'light' | 'dark';
}

export function HeroSection({ scrollVelocity = 0, theme = 'dark' }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const lenis = useLenis();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Immediate opening reveal on initial page load
      gsap.fromTo(
        '[data-hero-top]',
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.08,
          ease: 'power3.out',
        }
      );

      gsap.fromTo(
        '[data-hero-portrait]',
        { y: 26, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          delay: 0.06,
          ease: 'power3.out',
        }
      );

      gsap.to('[data-hero-arrow]', {
        y: 5,
        duration: 1.05,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Scroll-linked motion from top of page downward & cleanly back up
      gsap.fromTo(
        '[data-hero-scroll-stage]',
        { y: 0, opacity: 1, scale: 1 },
        {
          y: -52,
          opacity: 0.12,
          scale: 0.96,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom 18%',
            scrub: 0.45,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleScrollDown = () => {
    if (lenis) {
      lenis.scrollTo('#stats', { duration: 1.25 });
    } else {
      document.querySelector('#stats')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full pt-4 sm:pt-6 pb-10 px-[2.5%] select-none overflow-hidden"
    >
      {/* Top Row: Top-Left (Bold Large PRODUCT DESIGN + Creative Statement) & Top-Right (Light Typewriter About Me) */}
      <div
        data-scroll-shift
        className="w-full px-2 sm:px-3 grid grid-cols-1 md:grid-cols-12 gap-6 items-start mb-4 sm:mb-6 relative z-30 will-change-transform"
      >
        {/* Top-Left: Large Bold PRODUCT DESIGN + Creative Copy (Human Design removed) */}
        <div data-hero-top className="md:col-span-5 flex flex-col items-start">
          <h2 className="font-sans font-bold text-xl sm:text-2xl lg:text-[28px] tracking-tight uppercase leading-none">
            PRODUCT DESIGN
          </h2>
          <p className="font-sans font-light text-xs sm:text-[13px] leading-relaxed opacity-85 max-w-sm mt-2.5">
            <TypewriterText
              text="Creating something with passion — trying new ideas in the development industry through simple steps, crafted to scale creatively."
              speedMs={18}
              delayMs={120}
              startOnView={false}
            />
          </p>
        </div>

        {/* Center Spacer aligned to architectural grid */}
        <div className="hidden md:block md:col-span-2" />

        {/* Top-Right: Light About Me Bio typed smoothly */}
        <div data-hero-top className="md:col-span-5 md:text-right">
          <p className="font-sans font-light text-xs sm:text-sm leading-relaxed opacity-85 max-w-md md:ml-auto">
            <TypewriterText
              text="I'm Moamen — a Software Engineer & Product Designer shaping clear digital products. With a small team, I designed Nurabi alongside Rivka and Simulation Game."
              speedMs={20}
              delayMs={180}
              startOnView={false}
            />
          </p>
        </div>
      </div>

      {/* Centered Portrait Stage with 360° Orbiting Website & UI Interfaces Behind */}
      <div
        data-hero-scroll-stage
        className="relative w-full max-w-5xl mx-auto flex flex-col items-center will-change-transform"
      >
        {/* 360° Orbiting Website & UI Interfaces Canvas positioned directly behind the portrait */}
        <OrbitingInterfaces360 theme={theme} scrollVelocity={scrollVelocity} />

        <div className="relative flex flex-col items-center justify-center z-20">
          {/* Portrait Cutout Centered */}
          <div
            data-hero-portrait
            className="relative w-[250px] sm:w-[310px] md:w-[355px] lg:w-[395px] z-20"
          >
            <img
              src="/assets/aistudio/Cinematic_Upward_Profile_in_Blue_Hoodie_c953c0f5.png"
              alt="Moamen — Product Designer"
              className="w-full h-auto block object-contain pointer-events-none select-none drop-shadow-[0_22px_40px_rgba(6,13,61,0.42)]"
            />

            {/* LEFT EDGE TEXT 1: Mid-Left */}
            <div className="hidden sm:block sm:absolute sm:top-[42%] sm:right-full sm:mr-4 md:mr-6 sm:w-[180px] md:w-[230px] text-right font-pixel text-[10px] sm:text-[11px] leading-snug opacity-90 z-30">
              <ScrambleLines text="Designing clarity into every detail." delayMs={80} />
            </div>

            {/* LEFT EDGE TEXT 2: Bottom-Left (/ GRAPHIC DESIGN) */}
            <div className="hidden sm:block sm:absolute sm:bottom-[22%] sm:right-full sm:mr-4 md:mr-6 sm:w-[180px] md:w-[230px] text-right font-pixel text-[10px] sm:text-[11px] uppercase leading-snug opacity-95 z-30">
              <ScrambleLines text="/ GRAPHIC DESIGN" delayMs={150} />
            </div>

            {/* RIGHT EDGE TEXT 1: Mid-Right */}
            <div className="hidden sm:block sm:absolute sm:top-[42%] sm:left-full sm:ml-4 md:ml-6 sm:w-[180px] md:w-[230px] text-left font-pixel text-[10px] sm:text-[11px] leading-snug opacity-90 z-30">
              <ScrambleLines text="Turning ideas into living systems." delayMs={210} />
            </div>

            {/* RIGHT EDGE TEXT 2: Bottom-Right (/ PRODUCT DESIGNER) */}
            <div className="hidden sm:block sm:absolute sm:bottom-[22%] sm:left-full sm:ml-4 md:ml-6 sm:w-[180px] md:w-[230px] text-left font-pixel text-[10px] sm:text-[11px] uppercase leading-snug opacity-95 z-30">
              <ScrambleLines text="/ PRODUCT DESIGNER" delayMs={270} />
            </div>
          </div>
        </div>

        {/* Lower Giant 4-Language Typewriter Display Flush Against Portrait Base (zero space, hides cut) */}
        <div className="w-full relative z-30 pointer-events-none -mt-5 sm:-mt-9 md:-mt-12">
          <TypewriterGreetings8 />
        </div>

        {/* Mobile 2x2 Fallback for the 4 Edge Texts (keeps portrait flush with GREETINGS. on mobile too) */}
        <div className="sm:hidden w-full max-w-sm grid grid-cols-2 gap-x-4 gap-y-2.5 mt-4 px-2 font-pixel text-[10px] leading-snug z-30">
          <div className="text-left opacity-85">
            <ScrambleLines text="Designing clarity into detail." delayMs={80} />
          </div>
          <div className="text-right opacity-85">
            <ScrambleLines text="Turning ideas into systems." delayMs={140} />
          </div>
          <div className="text-left uppercase opacity-90">
            <ScrambleLines text="/ GRAPHIC DESIGN" delayMs={200} />
          </div>
          <div className="text-right uppercase opacity-90">
            <ScrambleLines text="/ PRODUCT DESIGNER" delayMs={260} />
          </div>
        </div>

        {/* Centered Down Arrow Underneath */}
        <button
          data-hero-arrow
          type="button"
          onClick={handleScrollDown}
          aria-label="Scroll down"
          className="mt-4 sm:mt-5 inline-flex items-center justify-center w-8 h-8 opacity-75 hover:opacity-100 transition-opacity cursor-pointer z-30"
        >
          <ArrowDown className="w-4 h-4 stroke-[1.75]" />
        </button>
      </div>
    </section>
  );
}
