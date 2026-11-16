import { useEffect, useRef } from 'react';
import { useLenis } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { OrbitingInterfaces360 } from './OrbitingInterfaces360';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  scrollVelocity?: number;
  theme?: 'light' | 'dark';
  isReady?: boolean;
  onOpenContact?: () => void;
}

const HERO_DISCIPLINES = [
  {
    id: 'ui-systems',
    label: 'UI SYSTEMS',
    target: '#work',
    posClass: 'md:left-[14%] md:top-[44%]',
    alignClass: 'items-start text-left',
  },
  {
    id: 'ux-research',
    label: 'UX ARCHITECTURE',
    target: '#stats',
    posClass: 'md:right-[14%] md:top-[44%]',
    alignClass: 'items-end text-right',
  },
  {
    id: 'interaction-design',
    label: 'INTERACTION FLOW',
    target: '#ship-voyage',
    posClass: 'md:left-[3%] md:top-[52%]',
    alignClass: 'items-start text-left',
  },
  {
    id: 'brand-craft',
    label: 'BRAND DESIGN',
    target: '#work',
    posClass: 'md:right-[3%] md:top-[56%]',
    alignClass: 'items-end text-right',
  },
] as const;

export function HeroSection({
  scrollVelocity = 0,
  theme = 'dark',
  isReady = true,
  onOpenContact,
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const lenis = useLenis();

  const handleJump = (selector: string) => {
    if (lenis) {
      lenis.scrollTo(selector, { duration: 1.25 });
    } else {
      document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      if (!isReady) {
        gsap.set(['[data-hero-copy]', '[data-hero-portrait]'], {
          opacity: 0,
          y: 20,
        });
        return;
      }

      const heroEntrance = gsap.timeline();
      heroEntrance
        .fromTo(
          '[data-hero-copy]',
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.65,
            stagger: 0,
            ease: 'none',
          },
          0
        )
        .fromTo(
          '[data-hero-portrait]',
          { y: 20, opacity: 0, scale: 0.985 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.65,
            ease: 'none',
          },
          0
        );

      gsap.fromTo(
        '[data-hero-scroll-stage]',
        { y: 0, opacity: 1, scale: 1 },
        {
          y: -44,
          opacity: 0.14,
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
  }, [isReady]);

  const isDark = theme === 'dark';

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative w-full md:h-[calc(100vh-48px)] md:min-h-[680px] md:max-h-[920px] pt-14 md:pt-0 pb-20 md:pb-0 px-[2.5%] sm:px-[3.5%] flex flex-col justify-end select-none overflow-hidden"
    >
      {/* Full Hero Visual Stage */}
      <div
        data-hero-scroll-stage
        className="relative w-full h-full flex flex-col justify-end items-center origin-bottom will-change-transform"
      >
        {/* Curved 3D Panoramic Website & UI Interfaces Strip Behind the Portrait */}
        <div className="relative md:absolute inset-x-0 top-0 md:top-[10%] lg:top-[11%] h-[220px] sm:h-[275px] lg:h-[310px] w-full pointer-events-none z-[5]">
          <OrbitingInterfaces360 theme={theme} scrollVelocity={scrollVelocity} />
        </div>

        {/* Centered Portrait Cutout Anchored Cleanly to Bottom Edge */}
        <div className="relative w-full flex justify-center items-end z-20 -mt-28 sm:-mt-32 md:mt-0 pointer-events-none">
          <div
            data-hero-portrait
            className="relative w-[310px] sm:w-[440px] md:w-[560px] lg:w-[650px] xl:w-[700px] translate-x-[5%] flex items-end justify-center [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] md:[mask-image:none]"
          >
            <img
              src="/assets/aistudio/moamen_hero_clean.png"
              alt="Moamen — Product & UX Designer"
              className="w-full h-auto block object-contain object-bottom pointer-events-none select-none drop-shadow-[0_22px_44px_rgba(6,13,61,0.42)]"
            />
          </div>
        </div>

        {/* 4 UI/UX Mini-Links around Portrait (Center Left/Right & Lower Left/Right) with Behance/LinkedIn-style hover underline & grow */}
        <div
          data-hero-copy
          className="grid grid-cols-2 gap-x-6 gap-y-3 w-full mt-5 md:mt-0 md:contents z-30"
        >
          {HERO_DISCIPLINES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleJump(item.target)}
              className={`group relative md:absolute ${item.posClass} z-30 inline-flex items-center gap-1.5 font-pixel text-[10px] sm:text-[11px] uppercase tracking-[0.12em] opacity-85 hover:opacity-100 hover:scale-110 transition-all duration-200 origin-center cursor-pointer pb-1 ${item.alignClass}`}
            >
              <span>{item.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 right-0 bottom-0 h-[1.5px] bg-current scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"
              />
            </button>
          ))}
        </div>

        {/* Bottom-Left Hero Headline (Longer Tall Display Copy) & Primary CTA */}
        <div
          data-hero-copy
          className="relative md:absolute md:left-0 md:bottom-8 lg:bottom-10 z-30 w-full md:w-auto max-w-[335px] sm:max-w-[385px] lg:max-w-[420px] mt-6 md:mt-0 flex flex-col items-start text-left"
        >
          <p className="font-sans text-[10px] sm:text-[11px] font-medium tracking-[0.24em] uppercase opacity-70 mb-2">
            HI, I&apos;M MOAMEN · PRODUCT &amp; UX DESIGNER
          </p>

          <h1 className="font-editorial font-medium text-[32px] sm:text-[38px] lg:text-[42px] xl:text-[46px] leading-[1.04] tracking-[-0.02em]">
            I create design
            <br />
            who need to someone
            <br />
            deserve it.
          </h1>

          <button
            type="button"
            onClick={onOpenContact}
            className={`mt-5 inline-flex items-center gap-3 pl-1.5 pr-5 py-1.5 rounded-full text-xs sm:text-[13px] font-medium tracking-tight transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg ${
              isDark
                ? 'bg-[#F4F6FF] text-[#060D3D] hover:bg-white'
                : 'bg-[#0D1117] text-[#F4F6FF] hover:bg-black'
            }`}
          >
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                isDark
                  ? 'bg-[#060D3D] text-[#F4F6FF]'
                  : 'bg-[#C8E3FA] text-[#0D1117]'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span>Begin a project</span>
          </button>
        </div>

        {/* Bottom-Right Editorial Quote & Handwritten Signature */}
        <div
          data-hero-copy
          className="relative md:absolute md:right-0 md:bottom-10 lg:bottom-12 z-30 w-full md:w-auto max-w-[320px] lg:max-w-[345px] mt-6 md:mt-0 self-start md:self-auto text-left md:text-right"
        >
          <blockquote className="font-editorial text-[16px] sm:text-[18px] lg:text-[19px] leading-[1.36] tracking-[-0.01em]">
            <span className="opacity-70">
              &ldquo;I help founders who care about the people they serve to{' '}
            </span>
            <span className="font-semibold opacity-100">
              build calm and really useful apps
            </span>
            <span className="opacity-70">, not more noise&rdquo;</span>
          </blockquote>

          <div
            className="font-signature text-[36px] sm:text-[42px] leading-none mt-2 opacity-90 select-none"
            aria-label="Moamen signature"
          >
            Moamen
          </div>
        </div>
      </div>
    </section>
  );
}
